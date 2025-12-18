import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class UserService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly dbConfig: any,
  ) {
    console.log('数据库配置:', this.dbConfig);
  }

  private users: User[] = [
    {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      name: '李四',
      email: 'lisi@example.com',
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 3,
      name: '王五',
      email: 'wangwu@example.com',
      createdAt: new Date('2024-01-03'),
    },
  ];

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return user;
  }

  create(userData: CreateUserDto): User {
    const newUser: User = {
      id: this.getNextId(),
      ...userData,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  update(id: number, userData: Partial<Omit<User, 'id' | 'createdAt'>>): User {
    const user = this.findOne(id); // 复用 findOne，会自动处理不存在的情况
    Object.assign(user, userData);
    return user;
  }

  remove(id: number): void {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    this.users.splice(index, 1);
  }

  private getNextId(): number {
    return this.users.length > 0
      ? Math.max(...this.users.map((u) => u.id)) + 1
      : 1;
  }
}
