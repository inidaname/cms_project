// Generalized cart-selection engine (prompt 9, phase 9d).
// Validates a structured selection against the LIVE tenant configuration
// (option groups/choices, slots) and prices it deterministically:
//
//   unit price = (variation price | product base price) + Σ choice.price_delta × qty
//
// The validated selection is returned as a frozen snapshot object for
// CartItems.configuration. Enforcement derives from live configuration
// (a product's option groups / the referenced slot) — no industry branches.
export interface PrismaClientLike {
  optionGroup: {
    findMany(args: any): Promise<any[]>;
  };
  offeringSlot: {
    findFirst(args: any): Promise<any>;
  };
  product: {
    findFirst(args: any): Promise<any>;
  };
}

export interface SelectionChoice {
  choice_id: string;
  quantity: number;
}

export interface SelectionGroup {
  group_id: string;
  choices: SelectionChoice[];
}

export interface CartSelection {
  groups?: SelectionGroup[];
  slot_id?: string;
  participants?: number;
}

export interface SelectionValidationResult {
  unitPriceDelta: number;
  configuration: {
    groups: { group_id: string; choices: { choice_id: string; quantity: number }[] }[];
    slot_id: string | null;
    participants: number | null;
  };
}

function selectionError(message: string): never {
  throw {
    statusCode: 400,
    status: "error",
    message,
  };
}

/**
 * Validates and prices one item's selection. `basePrice` is the product or
 * variation price; the returned delta is added to it by the caller.
 */
export async function validateAndPriceSelection(
  prisma: PrismaClientLike,
  tenant_id: string,
  product_id: string,
  basePrice: number,
  selections: CartSelection,
  itemQuantity = 1,
): Promise<SelectionValidationResult> {
  const requestedGroups = selections.groups ?? [];
  let unitPriceDelta = 0;
  const snapshotGroups: SelectionValidationResult["configuration"]["groups"] = [];

  // Load the product's live groups + choices (tenant-scoped).
  const groups: any[] = await prisma.optionGroup.findMany({
    where: { tenant_id, product_id },
    include: { choices: true },
  });
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  for (const requested of requestedGroups) {
    const group = groupsById.get(requested.group_id);
    if (!group) {
      selectionError(`Option group ${requested.group_id} does not belong to this offering`);
    }

    const chosen = requested.choices ?? [];
    const distinctChoices = new Set(chosen.map((c) => c.choice_id)).size;
    if (group!.required && distinctChoices === 0) {
      selectionError(`Option group "${group!.name}" is required`);
    }
    if (distinctChoices < group!.min_select) {
      selectionError(`Option group "${group!.name}" requires at least ${group!.min_select} selection(s)`);
    }
    if (distinctChoices > group!.max_select) {
      selectionError(`Option group "${group!.name}" allows at most ${group!.max_select} selection(s)`);
    }

    const choicesById = new Map<string, any>(group!.choices.map((c: any) => [c.id, c]));
    const snapshotChoices: { choice_id: string; quantity: number }[] = [];

    for (const choice of chosen) {
      const live = choicesById.get(choice.choice_id);
      if (!live) {
        selectionError(`Choice ${choice.choice_id} does not belong to group "${group!.name}"`);
      }
      if (!live!.active) {
        selectionError(`Choice "${live!.label}" is not available`);
      }
      const quantity = Number(choice.quantity) || 1;
      if (quantity < 1) {
        selectionError(`Choice "${live!.label}" quantity must be at least 1`);
      }

      // Linked products must be tenant-owned; stock is advisory-checked.
      if (live!.product_id) {
        const linked = await prisma.product.findFirst({
          where: { id: live!.product_id, tenant_id },
          select: { quantity: true },
        });
        if (!linked) {
          selectionError(`Choice "${live!.label}" is not available`);
        }
        if (linked.quantity != null && linked.quantity < quantity) {
          selectionError(`Choice "${live!.label}" does not have enough stock`);
        }
      }

      unitPriceDelta += Number(live!.price_delta) * quantity;
      snapshotChoices.push({ choice_id: choice.choice_id, quantity });
    }

    snapshotGroups.push({ group_id: group!.id, choices: snapshotChoices });
  }

  // Required groups must be covered even if the client omitted them.
  for (const group of groups) {
    if (group.required && !snapshotGroups.some((s) => s.group_id === group.id)) {
      selectionError(`Option group "${group.name}" is required`);
    }
  }

  // Slot: scheduling + capacity (advisory check; checkout is authoritative).
  let slot_id: string | null = null;
  if (selections.slot_id) {
    const slot = await prisma.offeringSlot.findFirst({
      where: { id: selections.slot_id, tenant_id, product_id },
      select: { id: true, startsAt: true, endsAt: true, capacity: true, bookedCount: true },
    });
    if (!slot) {
      selectionError("Selected time slot does not belong to this offering");
    }
    if (slot!.startsAt.getTime() <= Date.now()) {
      selectionError("Selected time slot has already started");
    }
    if (
      slot!.capacity != null &&
      slot!.bookedCount + Math.max(1, itemQuantity) > slot!.capacity
    ) {
      selectionError("Selected time slot is fully booked");
    }
    slot_id = slot!.id;
  }

  const participants =
    selections.participants != null && Number(selections.participants) > 0
      ? Math.floor(Number(selections.participants))
      : null;

  return {
    unitPriceDelta,
    configuration: {
      groups: snapshotGroups,
      slot_id,
      participants,
    },
  };
}
