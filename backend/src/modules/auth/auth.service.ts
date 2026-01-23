import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IamService } from '../iam/iam.service';
import { LoginDto, ChangeCredentialsDto } from './auth.dto';
import { User } from '../iam/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly iamService: IamService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.validateUser(payload.username, payload.password);
    const permissions = await this.iamService.getUserPermissions(user.id);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      permissions,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        positionId: user.positionId,
        mustChangePassword: user.mustChangePassword,
        permissions,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.iamService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const permissions = await this.iamService.getUserPermissions(user.id);
    return {
      id: user.id,
      username: user.username,
      positionId: user.positionId,
      mustChangePassword: user.mustChangePassword,
      permissions,
    };
  }

  async changeCredentials(userId: number, payload: ChangeCredentialsDto) {
    const user = await this.iamService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (payload.newUsername && payload.newUsername !== user.username) {
      const existing = await this.iamService.findUserByUsername(payload.newUsername);
      if (existing) {
        throw new BadRequestException('Username already exists');
      }
      user.username = payload.newUsername;
    }
    user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    user.mustChangePassword = false;
    await user.save();
    return { success: true };
  }

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.iamService.findUserByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
