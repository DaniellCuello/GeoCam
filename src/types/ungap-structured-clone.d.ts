declare module '@ungap/structured-clone' {
  const structuredClone: <T>(value: T, options?: any) => T;
  export default structuredClone;
}
