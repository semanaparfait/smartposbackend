import { Test, TestingModule } from '@nestjs/testing';
import { FloorMapService } from './floor-map.service';

describe('FloorMapService', () => {
  let service: FloorMapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FloorMapService],
    }).compile();

    service = module.get<FloorMapService>(FloorMapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
