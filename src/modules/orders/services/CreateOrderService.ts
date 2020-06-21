import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import ordersRouter from '../infra/http/routes/orders.routes';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // Check if customers exists
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not exists', 400);
    }

    // Get all ids products of products in request
    const productsIds = products.map(product => ({ id: product.id }));

    // Get all products based on ids passed on request
    const productList = await this.productsRepository.findAllById(productsIds);

    // check if any product cant be added in order,
    // cant be stoked quantity less than requested product,
    // cant be stoked quantity - requested product less than zero,
    products.filter(product => {
      const stockedProduct = productList.find(
        searchProduct => searchProduct.id === product.id,
      );

      if (
        stockedProduct &&
        stockedProduct.quantity - product.quantity <= 0 &&
        stockedProduct.quantity < product.quantity
      ) {
        throw new AppError('Product out of stock');
      }

      return stockedProduct;
    });

    if (productList.length < products.length) {
      throw new AppError('Invalid quantities');
    }

    const orderedProducts = productList.map(product => {
      const productIndex = products.findIndex(p => p.id === product.id);

      return {
        product_id: product.id,
        price: product.price,
        quantity: products[productIndex].quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });

    const stockUpdated = productList.map(product => {
      const productIndex = products.findIndex(p => p.id === product.id);

      return {
        id: product.id,
        quantity: products[productIndex].quantity,
      };
    });

    console.log('Stock Atualizado');
    console.log(stockUpdated);

    await this.productsRepository.updateQuantity(stockUpdated);

    return order;
  }
}

export default CreateOrderService;
