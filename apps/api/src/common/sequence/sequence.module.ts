import { Global, Module } from '@nestjs/common';
import { DocumentSequenceService } from './sequence.service';

@Global()
@Module({
  providers: [DocumentSequenceService],
  exports: [DocumentSequenceService],
})
export class SequenceModule {}
