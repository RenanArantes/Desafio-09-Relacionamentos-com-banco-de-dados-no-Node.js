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
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not exists', 400);
    }

    const productsIds = await products.map(product => ({ id: product.id }));

    const productList = await this.productsRepository.findAllById(productsIds);

    console.log(customer?.name);

    const order = await this.ordersRepository.create({
      customer,
      products: productList.map(product => ({
        product_id: product.id,
        price: product.price,
        quantity: product.quantity,
      })),
    });

    return order;
  }
}

export default CreateOrderService;
