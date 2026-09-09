import { Test, TestingModule } from '@nestjs/testing';
import { FloorMapController } from './floor-map.controller';
import { FloorMapService } from './floor-map.service';

describe('FloorMapController', () => {
  let controller: FloorMapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorMapController],
      providers: [FloorMapService],
    }).compile();

    controller = module.get<FloorMapController>(FloorMapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
