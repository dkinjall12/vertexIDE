import { WebContainer } from '@webcontainer/api';

// Singleton class to manage WebContainer instance
class WebContainerService {
  private static instance: WebContainerService | null = null;
  private webcontainerInstance: WebContainer | null = null;
  private mountPromise: Promise<void> | null = null;
  private isBooting = false;
  private bootPromise: Promise<WebContainer> | null = null;
  private activeUsers = 0;

  private constructor() {}

  public static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  public async getWebContainer(): Promise<WebContainer> {
    this.activeUsers++;
    
    if (this.webcontainerInstance) {
      return this.webcontainerInstance;
    }

    if (this.bootPromise) {
      return this.bootPromise;
    }

    this.isBooting = true;
    this.bootPromise = WebContainer.boot();
    
    try {
      this.webcontainerInstance = await this.bootPromise;
      return this.webcontainerInstance;
    } catch (error) {
      this.bootPromise = null;
      this.isBooting = false;
      throw error;
    } finally {
      this.bootPromise = null;
      this.isBooting = false;
    }
  }

  public async mountFiles(files: Record<string, any>): Promise<void> {
    const instance = await this.getWebContainer();
    
    if (!this.mountPromise) {
      this.mountPromise = instance.mount(files);
    }
    
    return this.mountPromise;
  }

  public async spawn(command: string, args: string[] = []): Promise<any> {
    const instance = await this.getWebContainer();
    return instance.spawn(command, args);
  }

  public releaseInstance(): void {
    this.activeUsers--;
    
    // Only tear down if no components are using the instance
    if (this.activeUsers <= 0) {
      this.teardown();
    }
  }

  public teardown(): void {
    if (this.webcontainerInstance) {
      this.webcontainerInstance.teardown();
      this.webcontainerInstance = null;
    }
    this.mountPromise = null;
    this.bootPromise = null;
    this.activeUsers = 0;
  }

  public onServerReady(callback: (port: number, url: string) => void): void {
    if (this.webcontainerInstance) {
      this.webcontainerInstance.on('server-ready', callback);
    }
  }


}

export default WebContainerService.getInstance();