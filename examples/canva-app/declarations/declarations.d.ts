// CSS Modules
declare module "*.css" {
  const styles: Record<string, string>;
  export = styles;
}

// Image assets
declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

// Globals injected by webpack DefinePlugin
declare const BACKEND_HOST: string | undefined;
declare const CANUP_API_URL: string | undefined;
