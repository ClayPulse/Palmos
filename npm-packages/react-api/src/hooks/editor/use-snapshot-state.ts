import { useContext, useEffect, useState } from "react";
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

  // Initialize state with the value from context or the initial value
  const [state, setState] = useState<T>(
    states[key] !== undefined ? states[key] : initialValue
  );

  // Update context whenever state changes
  const setSnapshotState: React.Dispatch<React.SetStateAction<T>> = (value) => {
    setState((prev) => {
      const newValue =
        typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

      // Defer the setStates call to next microtask, outside render phase
      Promise.resolve().then(() => {
        setStates((prevStates) => ({
          ...prevStates,
          [key]: newValue,
        }));
      });

      return newValue;
    });
  };

  // Set the initial value in context if not already set
  useEffect(() => {
    // Only set if the key does not exist in the context
    if (states[key] === undefined && initialValue !== undefined) {
      setStates((prevStates) => ({
        ...prevStates,
        [key]: initialValue,
      }));
    }
  }, []);

  // Restore state from context when key or states change
  useEffect(() => {
    console.log("Restoring state for key:", key, states[key]);

    if (states[key] !== undefined && states[key] !== state) {
      setState(states[key]);
      if (onRestore) {
        onRestore(states[key]);
      }
    }
  }, [states[key]]);

  return [state, setSnapshotState] as const;
}
