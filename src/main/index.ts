import { App } from './App';

function bootstrap(): void {
  try {
    const application = new App();
    application.start();
  } catch (error) {
    console.error('[app] > error to up application: ', error);
  }
}

bootstrap();
