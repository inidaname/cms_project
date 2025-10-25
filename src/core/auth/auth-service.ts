import { TenantService } from "../tenants/tenant-service";
import { UserService } from "../users/user-service";

export class AuthService {
  user: UserService;
  tenant: TenantService;

  constructor(prisma: PrismaClientType) {
    this.user = new UserService(prisma);
    this.tenant = new TenantService(prisma);
  }
}
