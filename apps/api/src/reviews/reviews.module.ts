import { Module } from '@nestjs/common';
import {
  AppointmentReviewController,
  OwnerStylistReviewController,
  StylistReviewController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [AppointmentReviewController, StylistReviewController, OwnerStylistReviewController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
