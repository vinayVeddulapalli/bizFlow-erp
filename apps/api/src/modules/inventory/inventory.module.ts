import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { AdvancedInventoryController } from './advanced-inventory.controller';
import { AdvancedInventoryService } from './advanced-inventory.service';

@Module({
  controllers: [
    ProductController,
    CategoryController,
    StockController,
    AdvancedInventoryController,
  ],
  providers: [
    ProductService,
    CategoryService,
    StockService,
    AdvancedInventoryService,
  ],
  exports: [
    ProductService,
    CategoryService,
    StockService,
    AdvancedInventoryService,
  ],
})
export class InventoryModule {}
