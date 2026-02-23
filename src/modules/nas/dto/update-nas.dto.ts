import { PartialType } from '@nestjs/swagger';
import { CreateNasDto } from './create-nas.dto';

export class UpdateNasDto extends PartialType(CreateNasDto) {}
