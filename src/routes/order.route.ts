import { Router } from 'express'
import { OrderController } from '../controllers/order.controller'

/**
 * License Routes
 */
class OrderRoutes {
  private static instance: OrderRoutes
  public router: Router

  constructor() {
    // Initialize router
    this.router = Router()

    this.router
      .route('/')
      /**
       * Get all orders
       */
      .get(OrderController.getAll)

    this.router
      .route('/create')
      /**
       * Create a new order
       */
      .post(OrderController.create)

    this.router
      .route('/:id')
      /**
       * Get single order
       */
      .get(OrderController.getOne)
  }

  /**
   * Singleton getter
   *
   * @returns {OrderRoutes} Routes instance
   */
  static get(): OrderRoutes {
    if (!OrderRoutes.instance) {
      OrderRoutes.instance = new OrderRoutes()
    }

    return OrderRoutes.instance
  }
}

const orderRoutes = OrderRoutes.get()
export { orderRoutes as OrderRoutes }
