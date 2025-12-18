import { Test, TestingModule } from '@nestjs/testing';
import { InterviewController } from './interview.controller';

describe('InterviewController', () => {
  let controller: InterviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewController],
    }).compile();

    controller = module.get<InterviewController>(InterviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
