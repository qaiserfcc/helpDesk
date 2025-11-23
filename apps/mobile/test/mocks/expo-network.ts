export async function getNetworkStateAsync() {
  return { isConnected: true, isInternetReachable: true };
}

export default { getNetworkStateAsync };
