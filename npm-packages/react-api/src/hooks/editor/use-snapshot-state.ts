import { useContext, useEffect, useRef, useState } from "react";
import { SnapshotContext } from "../../providers/snapshot-provider";

export default function useSnapShotState<T>(
  key: string,
  initialValue?: T,
  onRestore?: (value: T) => void
) {
  const snapshotContext = useContext(SnapshotContext);
  if (!snapshotContext) {
    throw new Error("useSnapShotState must be used within a SnapshotProvider");
  }

  const { states, setStates } = snapshotContext;
  const [state, setState] = useState<T>(
    states[key] !== undefined ? states[key] : initialValue
  );

  const isLocalUpdate = useRef(false);

  const setSnapshotState: React.Dispatch<React.SetStateAction<T>> = (value) => {
    setState((prev) => {
      const newValue =
        typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

      isLocalUpdate.current = true; // mark as local
      Promise.resolve().then(() => {
        setStates((prevStates) => ({
          ...prevStates,
          [key]: newValue,
        }));
      });

      return newValue;
    });
  };

  // Initialize context with initial value
  useEffect(() => {
    if (states[key] === undefined && initialValue !== undefined) {
      setStates((prev) => ({
        ...prev,
        [key]: initialValue,
      }));
    }
  }, []);

  // Only restore when external changes occur
  useEffect(() => {
    const contextValue = states[key];
    if (contextValue === undefined) return;

    if (isLocalUpdate.current) {
      // skip this run because we caused it ourselves
      isLocalUpdate.current = false;
      return;
    }

    if (contextValue !== state) {
      console.log("Restoring state for key:", key, contextValue);
      setState(contextValue);
      onRestore?.(contextValue);
    }
  }, [states[key]]);

  return [state, setSnapshotState] as const;
}
