/**
 * `src/global.css` sigue siendo CSS plano del template y Metro lo resuelve en
 * tiempo de ejecución, pero TypeScript necesita esta declaración para no marcar
 * el import como un módulo inexistente.
 */
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
