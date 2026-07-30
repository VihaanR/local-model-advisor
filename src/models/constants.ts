export const CTX_HEADROOM_GB = 0.8;      // KV-cache/context room on top of weights
export const CPU_OVERHEAD_GB = 2;        // runtime + context when running on CPU
export const OS_RESERVE_FRACTION = 0.25; // leave a quarter of RAM to the OS
export const Q4_GB_PER_B = 0.6;          // Q4 quantization: ~0.6 GB per billion params
