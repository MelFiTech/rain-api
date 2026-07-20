import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class WithdrawEarningsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsIn(['wallet', 'bank'])
  destination!: 'wallet' | 'bank';
}
