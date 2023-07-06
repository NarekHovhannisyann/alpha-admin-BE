import { IRouter as RouterInstance, Router as ExpressRouter } from "express";
import { UserRoutes } from "./user.route";
import { OrderRoutes } from "./order.route";
import { ProductRoutes } from "./product.route";

/**
 * Router Middleware
 */
class Router {
  private static instance: Router;
  public middleware: RouterInstance;

  constructor() {
    // Initialize router
    this.middleware = ExpressRouter();

    this.map([
      { segment: "/users", handler: UserRoutes.router },
      { segment: "/products", handler: ProductRoutes.router },
      { segment: "/orders", handler: OrderRoutes.router },
    ]);
  }

  /**
   * Singleton getter
   *
   * @returns {Router} Router instance
   */
  static get(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }

    return Router.instance;
  }

  /**
   * Map route handlers
   *
   * @param {IRoute[]} routes Route configs
   * @returns {void}
   */
  map(routes: any): void {
    routes.forEach((route: { segment: string; handler: any }) => {
      this.middleware.use(route.segment, route.handler);
    });
  }
}

const router = Router.get();
export { router as Router };