declare module 'pg' {
  const pg: { Client: new (...args: any[]) => any; [key: string]: any };
  export default pg;
}
