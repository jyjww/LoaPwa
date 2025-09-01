import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async validateUserByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async createUser(userData: Partial<User>) {
    const user = this.userRepo.create(userData);
    return this.userRepo.save(user);
  }

  async generateJwt(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }
}
