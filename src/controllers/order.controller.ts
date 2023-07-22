import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import { Order } from '../entities/orders.entity'
import { Driver } from '../entities/driver.entity'
import { Product } from '../entities/products.entity'
import { OrderProduct } from '../entities/orderProducts.entity'
import { getImageUrls } from '../services/firbase.service'
import { getOrderQueries } from '../utils/getFilterQueries'
import { DriverStatus } from '../types/types/driver.types'
import { OrderStatuses } from '../types/types/order.types'
import { DateTimeFormatOptions } from '../types/interfaces/TimeDateOptions.interface'

class OrderController {
  private static instance: OrderController

  static get(): OrderController {
    if (!OrderController.instance) {
      OrderController.instance = new OrderController()
    }

    return OrderController.instance
  }

  async getAll(req: Request, res: Response) {
    try {
      const { take = 10, skip = 0 } = req.query
      const queries = getOrderQueries(req)

      const orderRepository = getRepository(Order)
      const orders = await orderRepository.find({
        where: queries,
        skip: +skip,
        take: +take,
        order: {
          createdAt: 'DESC',
        },
      })

      const formattedOrders = orders.map((order) => {
        let deliveryDate: string | Date = order.deliveryDate
        if (deliveryDate) {
          const deliveryNewDate = new Date(
            order.deliveryDate.getTime() + 24 * 1000 * 60 * 60,
          )

          deliveryDate = deliveryNewDate.toISOString().split('T')[0]
        }

        const createdAtDate = new Date(
          order.createdAt.getTime() + 24 * 1000 * 60 * 60,
        )

        const createdAt = createdAtDate.toISOString().split('T')[0]
        return { ...order, createdAt, deliveryDate }
      })

      return res.send({ success: true, data: formattedOrders })
    } catch (err) {
      return res.send({ success: false, message: err.message })
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const orderRepository = getRepository(Order)
      const order = await orderRepository
        .createQueryBuilder('order')
        .leftJoin('order.orderProducts', 'orderProduct')
        .leftJoinAndSelect('orderProduct.product', 'product')
        .select([
          'order',
          'product',
          'orderProduct.quantity',
          'orderProduct.size',
        ])
        .where('order.id = :id', { id })
        .getOne()

      if (!order) {
        return res
          .status(400)
          .send({ success: false, message: "Order wasn't found" })
      }

      let orderProducts = []

      for (let i = 0; i < order.orderProducts.length; i++) {
        const productImages = await getImageUrls(
          `products/${order.orderProducts[i].product.id}`,
        )

        orderProducts.push({
          quantity: order.orderProducts[i].quantity,
          size: order.orderProducts[i].size,
          product: { ...order.orderProducts[i].product, images: productImages },
        })
      }

      const options: DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }

      let deliveryDate: Date | string = order.deliveryDate

      if (deliveryDate) {
        const date = new Date(deliveryDate)
        deliveryDate = date.toLocaleString('en-GB', options)
      }
      const createdNewDate = new Date(order.createdAt)
      const formattedDate = createdNewDate.toLocaleString('en-GB', options)

      return res.send({
        success: true,
        data: { ...order, formattedDate, deliveryDate, orderProducts },
      })
    } catch (err) {
      return res.status(500).send({ success: false, message: err.message })
    }
  }

  async create(req: Request, res: Response) {
    try {
      let { fullName, deliveryDate, phone, driver, address, productIDs } =
        req.body

      const orderRepository = getRepository(Order)
      const driverRepository = getRepository(Driver)
      const productRepository = getRepository(Product)

      const order: Order = Object.assign(new Order(), {
        ...req.body,
      })

      if (driver) {
        const orderDriver = await driverRepository.findOne({
          where: { fullName: driver },
        })

        if (!orderDriver) {
          return res.status(400).send({ message: 'Առաքիչը բացակայում է' })
        }

        if (orderDriver.status === DriverStatus.DELIVERY) {
          return res.status(400).send({ message: 'Առաքիչը Զբաղված է' })
        }

        orderDriver.status = DriverStatus.DELIVERY

        await driverRepository.save(orderDriver)
      }

      let orderProducts = []

      if (!(fullName && phone && address && productIDs.length)) {
        return res.status(400).send({ message: 'Պարամետրերը բացակայում են' })
      }

      for (let i = 0; i < productIDs.length; i++) {
        const product = await productRepository.findOneOrFail({
          where: { id: productIDs[i].id },
        })

        const orderProduct = new OrderProduct()
        orderProduct.product = product
        orderProduct.quantity = productIDs[i].quantity
        orderProduct.size = productIDs[i].size
        orderProduct.orderId = order.id
        orderProduct.productId = product.id

        orderProducts.push(orderProduct)
      }

      if (deliveryDate) {
        deliveryDate = +new Date(deliveryDate)
      } else {
        deliveryDate = order.createdAt
      }

      order.orderProducts = orderProducts
      order.status = OrderStatuses.RECEIVED

      const createdOrder = await orderRepository.save(order)

      const createdAtDate = new Date(
        createdOrder.createdAt.getTime() + 24 * 1000 * 60 * 60,
      )

      const formattedDate = createdAtDate.toISOString().split('T')[0]

      return res.send({
        success: true,
        data: { ...createdOrder, formattedDate },
      })
    } catch (err) {
      return res.send({ success: false, message: err.message })
    }
  }

  async update(req: Request, res: Response) {
    try {
      let { createdAt, deliveryDate, status } = req.body
      const id = parseInt(req.params.id)
      const orderRepository = getRepository(Order)
      const driverRepository = getRepository(Driver)

      const order = await orderRepository.findOneOrFail({
        where: { id },
      })

      if (status && status === OrderStatuses.COMPLETED) {
        const driver = await driverRepository.findOne({
          where: {
            fullName: order.driver,
          },
        })
        order.driver = null
        driver.status = DriverStatus.FREE

        await driverRepository.save(driver)
      }

      const savedOrder = await orderRepository.save({
        ...order,
        createdAt: createdAt ? +new Date(createdAt) : order.createdAt,
        deliveryDate: deliveryDate
          ? +new Date(deliveryDate)
          : order.deliveryDate,
        ...req.body,
        orderProducts: order.orderProducts,
      })

      return res.send({
        success: true,
        data: savedOrder,
        message: 'Պատվերը հաջողությամբ թարմացված է',
      })
    } catch (err) {
      return res.send({ success: false, message: err.message })
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const orderRepository = getRepository(Order)

      const orderToRemove = await orderRepository.findOneOrFail({
        where: { id },
      })

      if (!orderToRemove) {
        return res
          .status(400)
          .send({ success: false, message: 'Ապրանքը չի գտնվել' })
      }

      await orderRepository.remove(orderToRemove)

      return res.send({ success: true, message: 'Ապրանքը հեռացված է' })
    } catch (err) {
      return res.status(500).send({ success: false, message: err.message })
    }
  }
}

const orderController = OrderController.get()
export { orderController as OrderController }
