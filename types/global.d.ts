declare namespace Truffle {
  type MigrationPromise = (
    deploy: Promise<Deployer>,
    network: string,
    accounts: Accounts
  ) => void;
}

declare type AnyFunction = (...args: any[]) => any;

declare type Resolved<T extends Promise<any>> = T extends Promise<infer U>
  ? U
  : never;

declare type ResolvedReturnType<T extends AnyFunction> = Resolved<
  ReturnType<T>
>;
