"use client";

import { useEffect, useState } from "react";
// import { Abi, AbiFunction } from "abitype";
// import { Address, TransactionReceipt } from "viem";
// import { useContractWrite, useNetwork, useWaitForTransaction } from "wagmi";
import {
  ContractInput,
  convertStringToInputInstance,
  //   TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import {
  useAccount,
  useContractWrite,
  useNetwork,
  useWaitForTransaction,
} from "@starknet-react/core";
import { Abi } from "abi-wan-kanabi";
import {
  AbiFunction,
  ContractName,
  parseParamWithType,
} from "~~/utils/scaffold-stark/contract";
import { Address } from "@starknet-react/chains";
import { InvokeTransactionReceiptResponse } from "starknet";
import { TxReceipt } from "./TxReceipt";
import { useTransactor } from "~~/hooks/scaffold-stark";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldMultiWriteContract } from "~~/hooks/scaffold-stark/useScaffoldMultiWriteContract";

type WriteOnlyFunctionFormProps = {
  abi: Abi;
  abiFunction: AbiFunction;
  onChange: () => void;
  contractAddress: Address;
  contractName: ContractName;
  //   inheritedFrom?: string;
};

export const WriteOnlyFunctionForm = ({
  abi,
  abiFunction,
  onChange,
  contractAddress,
  contractName,
}: //   inheritedFrom,
WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() =>
    getInitialFormState(abiFunction),
  );
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const { status: walletStatus } = useAccount();
  const { chain } = useNetwork();

  const { targetNetwork } = useTargetNetwork();
  const writeDisabled =
    !chain ||
    chain?.network !== targetNetwork.network ||
    walletStatus === "disconnected";

  // side effect to update error state when not connected
  useEffect(() => {
    setFormErrorMessage(
      writeDisabled ? "Wallet not connected or in the wrong network" : null,
    );
  }, [writeDisabled]);

  // const writeTxn = useTransactor();

  // const {
  //   data: result,
  //   isPending: isLoading,
  //   writeAsync,
  // } = useContractWrite({
  //   calls: [
  //     {
  //       contractAddress,
  //       entrypoint: abiFunction.name,

  //       // use infinity to completely flatten array from n dimensions to 1 dimension
  //       calldata: getParsedContractFunctionArgs(form, false).flat(Infinity),
  //     },
  //   ],
  // });

  // const {
  //   data: result,
  //   isPending: isLoading,
  //   writeAsync,
  // } = useScaffoldMultiWriteContract({
  //   calls: [
  //     {
  //       contractName,
  //       //@ts-expect-error we expect the UI to input the correct corresponding type
  //       functionName: abiFunction.name,
  //       calldata: getParsedContractFunctionArgs(form, false).flat(Infinity),
  //     },
  //   ],
  // });

  const {
    data: result,
    isPending: isLoading,
    writeAsync,
  } = useScaffoldWriteContract({
    contractName,
    //@ts-expect-error we expect the UI to input the correct corresponding type
    functionName: abiFunction.name,
  });

  const handleWrite = async () => {
    try {
      const stringArgs = Object.values(form);
      const args = stringArgs.map((stringArg: string, index: number) => {
        return convertStringToInputInstance(
          abiFunction.inputs[index].type,
          stringArg,
        );
      });
      console.debug({
        args,
      });
      await writeAsync({
        //@ts-expect-error args should correspond from how UI is defined
        args,
      });
      onChange();
    } catch (e: any) {
      const errorPattern = /Contract (.*?)"}/;
      const match = errorPattern.exec(e.message);
      const message = match ? match[1] : e.message;

      console.error(
        "⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error",
        message,
      );
    }
  };

  const [displayedTxResult, setDisplayedTxResult] =
    useState<InvokeTransactionReceiptResponse>();
  const { data: txResult } = useWaitForTransaction({
    hash: result?.transaction_hash,
  });
  useEffect(() => {
    setDisplayedTxResult(txResult as InvokeTransactionReceiptResponse);
  }, [txResult]);

  // TODO use `useMemo` to optimize also update in ReadOnlyFunctionForm
  const transformedFunction = transformAbiFunction(abiFunction);
  const inputs = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        abi={abi}
        key={key}
        setForm={(updatedFormValue) => {
          setDisplayedTxResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
        setFormErrorMessage={setFormErrorMessage}
      />
    );
  });
  const zeroInputs = inputs.length === 0;

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div
        className={`flex gap-3 ${
          zeroInputs ? "flex-row justify-between items-center" : "flex-col"
        }`}
      >
        <p className="font-medium my-0 break-words text-function">
          {abiFunction.name}
          {/* <InheritanceTooltip inheritedFrom={undefined} /> */}
        </p>
        {inputs}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="flex-grow basis-0">
              {displayedTxResult ? (
                <TxReceipt txResult={displayedTxResult} />
              ) : null}
            </div>
          )}
          <div
            className={`flex ${
              formErrorMessage &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${formErrorMessage}`}
          >
            <button
              className="btn bg-gradient-dark btn-sm shadow-none border-none text-white"
              disabled={!!formErrorMessage || isLoading}
              onClick={handleWrite}
            >
              {isLoading && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              Send 💸
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && txResult ? (
        <div className="flex-grow basis-0">
          <TxReceipt txResult={txResult} />
        </div>
      ) : null}
    </div>
  );
};
