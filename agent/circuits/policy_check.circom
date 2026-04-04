// Arvyon Policy Compliance Circuit
// Circom 1 implementation

template PolicyCheck() {
    // Inputs (private - not exposed to verifier)
    signal private input actionValue;
    signal private input policyMin;
    signal private input policyMax;

    // Public output (exposed to verifier)
    signal output isCompliant;

    // Intermediate signals
    signal minCheckPass;
    signal maxCheckPass;

    // Range check: actionValue >= policyMin
    minCheckPass <-- (actionValue >= policyMin) ? 1 : 0;

    // Range check: actionValue <= policyMax
    maxCheckPass <-- (actionValue <= policyMax) ? 1 : 0;

    // Both must pass
    isCompliant <== minCheckPass * maxCheckPass;

    // Ensure binary
    minCheckPass * (minCheckPass - 1) === 0;
    maxCheckPass * (maxCheckPass - 1) === 0;
}

component main = PolicyCheck();
