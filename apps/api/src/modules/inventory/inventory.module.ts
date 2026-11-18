import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [ProductController, CategoryController, StockController],
  providers: [ProductService, CategoryService, StockService],
  exports: [ProductService, CategoryService, StockService],
})
export class InventoryModule {}
