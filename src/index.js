const core = require("@actions/core");
const github = require("@actions/github");
const { default: axios } = require("axios");
const { spawn } = require("child_process");
const { randomBytes } = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { getLatestBlockNumber } = require("./network");
// const {
//   compressBboutIfExists,
// } = require("./util/test-resimulation/runCompression");
// const {
//   sendCompressedDataToBackend,
// } = require("./util/test-resimulation/sendCompressedData");
// const {
//   processContractArtifacts,
// } = require("./util/auto-verification/contractArtifactProcessor");
// const {
//   sendContractArtifactsToBackend,
// } = require("./util/auto-verification/sendContractArtifacts");
// const { findDirectory } = require("./util/pathOperations");

// /**
//  * Recursively walk through directories
//  * @param {string} dir Directory to walk through
//  * @returns {AsyncGenerator<{path: string, name: string, isFile: boolean, isDirectory: boolean}>}
//  */
// async function* walk(dir) {
//   const files = await fs.readdir(dir, { withFileTypes: true });
//   for (const dirent of files) {
//     const res = path.resolve(dir, dirent.name);
//     if (dirent.isDirectory()) {
//       yield* walk(res);
//     } else {
//       yield {
//         path: res,
//         name: dirent.name,
//         isFile: dirent.isFile(),
//         isDirectory: false,
//       };
//     }
//   }
// }


// /**
//  * Processes broadcast directory to collect deployment information
//  * @param {string} chainId Chain identifier
//  * @param workingDir
//  * @returns {Promise<Object>} Deployment information
//  */
// async function processBroadcastDirectory(chainId, workingDir) {
//   try {
//     // Find broadcast and build directories
//     const broadcastDir = await findDirectory("broadcast", workingDir);
//     if (!broadcastDir) {
//       console.log("No broadcast directory found");
//       return null;
//     }

//     const buildDir = path.join(workingDir, "build");

//     // Process event ABIs from build directory
//     const eventAbi = [];
//     if (
//       await fs
//         .access(buildDir)
//         .then(() => true)
//         .catch(() => false)
//     ) {
//       for await (const entry of walk(buildDir)) {
//         if (entry.isFile && entry.name.endsWith(".json")) {
//           const content = await fs.readFile(entry.path, "utf8");
//           const buildJson = JSON.parse(content);
//           if (Array.isArray(buildJson.abi)) {
//             eventAbi.push(...buildJson.abi.filter((x) => x.type === "event"));
//           }
//         }
//       }
//     }

//     // Process deployment data
//     const deployments = {
//       transactions: [],
//       receipts: [],
//       libraries: [],
//     };

//     // Process broadcast files
//     for await (const entry of walk(broadcastDir)) {
//       if (
//         entry.isFile &&
//         entry.name === "run-latest.json" &&
//         entry.path.includes(chainId.toString())
//       ) {
//         console.log(`Processing broadcast file: ${entry.path}`);

//         const content = await fs.readFile(entry.path, "utf8");
//         const runLatestJson = JSON.parse(content);

//         if (runLatestJson.transactions) {
//           deployments.transactions.push(...runLatestJson.transactions);
//         }
//         if (runLatestJson.receipts) {
//           deployments.receipts.push(...runLatestJson.receipts);
//         }
//         if (runLatestJson.libraries) {
//           deployments.libraries.push(...runLatestJson.libraries);
//         }
//       }
//     }

//     // Sort receipts by block number
//     if (deployments.receipts.length > 0) {
//       deployments.receipts.sort(
//         (a, b) => parseInt(a.blockNumber) - parseInt(b.blockNumber),
//       );

//       // Sort transactions based on receipt order
//       deployments.transactions.sort((a, b) => {
//         const aIndex = deployments.receipts.findIndex(
//           (receipt) => receipt.transactionHash === a.hash,
//         );
//         const bIndex = deployments.receipts.findIndex(
//           (receipt) => receipt.transactionHash === b.hash,
//         );
//         return aIndex - bIndex;
//       });

//       // Process logs
//       deployments.receipts = deployments.receipts.map((receipt) => ({
//         ...receipt,
//         decodedLogs: receipt.logs.map((log) => {
//           try {
//             return {
//               eventName: "Event",
//               data: log.data,
//               topics: log.topics,
//             };
//           } catch (e) {
//             console.log("Error decoding log:", e);
//             return null;
//           }
//         }),
//       }));
//     }

//     return deployments;
//   } catch (error) {
//     console.error("Error processing broadcast directory:", error);
//     throw error;
//   }
// }

// /**
//  * Creates a sandbox node and returns the BuildBear RPC URL.
//  *
//  * @param {string} repoName - The repository name
//  * @param {string} commitHash - The commit hash
//  * @param {number} chainId - The chain ID for the fork
//  * @param {number} blockNumber - The block number for the fork
//  * @returns {string} - The BuildBear RPC URL for the sandbox node
//  */
// async function createNode(repoName, commitHash, chainId, blockNumber) {
//   try {
//     const sandboxId = `${repoName}-${commitHash.slice(0, 8)}-${randomBytes(4).toString("hex")}`;
//     // Use BUILDBEAR_BASE_URL if it exists, otherwise use the hard-coded URL
//     const baseUrl =
//       process.env.BUILDBEAR_BASE_URL || "https://api.buildbear.io";
//     const url = `${baseUrl}/v1/buildbear-sandbox`;
//     const bearerToken = core.getInput("buildbear-token", { required: true });

//     const data = {
//       chainId: Number(chainId),
//       nodeName: sandboxId.toString(),
//       blockNumber: blockNumber ? Number(blockNumber) : undefined,
//     };

//     const response = await axios.post(url, data, {
//       headers: {
//         Authorization: `Bearer ${bearerToken}`,
//         "Content-Type": "application/json",
//       },
//     });

//     core.exportVariable("BUILDBEAR_RPC_URL", response.data.rpcUrl);
//     core.exportVariable("MNEMONIC", response.data.mnemonic);
//     return {
//       url: response.data.rpcUrl,
//       sandboxId,
//     };
//   } catch (error) {
//     console.error(
//       "Error creating node:",
//       error.response?.data || error.message,
//     );
//     throw error;
//   }
// }

// /**
//  * Checks if the node is ready by continuously polling for status.
//  *
//  * @param {string} url - The BuildBear RPC URL
//  * @param {number} maxRetries - Maximum number of retries before giving up
//  * @param {number} delay - Delay between retries in milliseconds
//  * @returns {boolean} - Returns true if the node becomes live, otherwise false
//  */
// async function checkNodeLiveness(url, maxRetries = 10, delay = 5000) {
//   let attempts = 0;
//   while (attempts < maxRetries) {
//     try {
//       const resp = await axios.post(url, {
//         jsonrpc: "2.0",
//         id: 1,
//         method: "eth_chainId",
//         params: [],
//       });

//       // Check if status is 200 and if result is absent
//       if (resp.status === 200 && resp.data.result) {
//         console.log(`Sandbox is live: ${url}`);
//         return true;
//       }
//     } catch (error) {
//       console.log(error);
//       console.error(
//         `Attempt ${attempts + 1}: Sandbox is not live yet. Retrying...`,
//       );
//     }

//     // Wait for the specified delay before the next attempt
//     await new Promise((resolve) => setTimeout(resolve, delay));
//     attempts++;
//   }

//   console.error(`Node did not become live after ${maxRetries} attempts.`);
//   return false;
// }

// /**
//  * Processes test artifacts by compressing the bbout directory and sending it to the backend
//  * @param {string} workingDir - Working directory where bbout is located
//  * @param {Object} options - Options for processing
//  * @param {string} options.status - Status of the operation ("success" or "failed")
//  * @param {string} options.message - Message describing the operation result
//  * @returns {Promise<{compressedFilePath: string|null, metadata: Object|null, response: Object|null}>}
//  */
// async function processTestResimulationArtifacts(workingDir, options = {}) {
//   try {
//     console.log("Processing test resimulation artifacts...");

//     // Compress bbout directory if it exists
//     const { compressedFilePath, metadata } = await compressBboutIfExists(
//       workingDir,
//       {
//         status: options.status || "success",
//         message: options.message || "Test artifacts processed",
//         directoryName: "bbOut",
//       },
//     );

//     // If no compressed file was created, return early
//     if (!compressedFilePath) {
//       console.log(
//         "No bbout directory found or compression failed. Skipping artifact upload.",
//       );
//       return { compressedFilePath: null, metadata: null, response: null };
//     }

//     // Send the compressed file to the backend
//     const response = await sendCompressedDataToBackend(
//       compressedFilePath,
//       metadata,
//     );

//     return { compressedFilePath, metadata, response };
//   } catch (error) {
//     console.error(`Error processing test artifacts: ${error.message}`);
//     return { compressedFilePath: null, metadata: null, response: null };
//   }
// }

// /**
//  * Processes contract artifacts for auto verification and sends them to the backend
//  * @param {string} workingDir - Working directory where contracts are located
//  * @param {Object} options - Options for processing
//  * @param {string} options.status - Status of the operation ("success" or "failed")
//  * @param {string} options.message - Message describing the operation result
//  * @returns {Promise<{artifacts: Object|null, response: Object|null}>}
//  */
// async function processContractVerificationArtifacts(workingDir, options = {}) {
//   try {
//     console.log("Processing contract verification artifacts...");

//     // Set the directory paths for contract artifacts
//     const broadcastDir = await findDirectory("broadcast", workingDir);
//     const outDir = await findDirectory("out", workingDir);

//     // Check if directories exist
//     try {
//       await fs.access(broadcastDir);
//       await fs.access(outDir);
//     } catch (error) {
//       console.log(
//         `Required directories not found: ${error.message}. Skipping contract verification.`,
//       );
//       return { artifacts: null, response: null };
//     }

//     // Process contract artifacts
//     console.log("Collecting contract artifacts for verification...");
//     const contractArtifacts = await processContractArtifacts(
//       broadcastDir,
//       outDir,
//     );

//     // If no artifacts were found, return early
//     if (!contractArtifacts || Object.keys(contractArtifacts).length === 0) {
//       console.log("No contract artifacts found. Skipping artifact upload.");
//       return { artifacts: null, response: null };
//     }

//     // Send the artifacts to the backend
//     console.log("Sending contract artifacts to backend...");
//     const response = await sendContractArtifactsToBackend(contractArtifacts, {
//       status: options.status || "success",
//       message:
//         options.message || "Contract artifacts processed for verification",
//     });

//     return { artifacts: contractArtifacts, response };
//   } catch (error) {
//     console.error(
//       `Error processing contract verification artifacts: ${error.message}`,
//     );
//     return { artifacts: null, response: null };
//   }
// }

// /**
//  * Executes the deployment command.
//  *
//  * @param {string} deployCmd - The command to deploy the contracts
//  * @param workingDir
//  */
// async function executeDeploy(deployCmd, workingDir) {
//   console.log(`Executing deploy command: ${deployCmd}`);
//   console.log(`Working directory: ${workingDir}`);

//   const promise = new Promise((resolve, reject) => {
//     const child = spawn(deployCmd, {
//       shell: true,
//       cwd: workingDir,
//       stdio: "inherit",
//     });

//     child.on("error", (error) => {
//       console.error(`Error executing deploy command: ${error.message}`);
//       reject(error);
//     });

//     child.on("close", (code) => {
//       if (code !== 0) {
//         console.error(`Deployment failed with exit code ${code}`);
//       } else {
//         console.log("Deployment completed successfully");
//       }
//       resolve(code);
//     });
//   });

//   const exitCode = await promise;

//   // Process test resimulation artifacts after deployment
//   await processTestResimulationArtifacts(workingDir, {
//     status: exitCode === 0 ? "success" : "failed",
//     message:
//       exitCode === 0
//         ? "Deployment completed successfully"
//         : `Deployment failed with exit code ${exitCode}`,
//   });

//   // Process the auto verification artifacts
//   await processContractVerificationArtifacts(workingDir, {
//     status: exitCode === 0 ? "success" : "failed",
//     message:
//       exitCode === 0
//         ? "Deployment completed successfully"
//         : `Deployment failed with exit code ${exitCode}`,
//   });
// }

// /**
//  * Extracts relevant contract data for notification
//  * @param {Object|Array} data - Deployment data to extract from
//  * @returns {Array} - Array of extracted contract data
//  */
// const extractContractData = (data) => {
//   const arrayData = Array.isArray(data) ? data : [data]; // Ensure data is an array

//   return arrayData.map((item) => ({
//     chainId: item.chainId || null,
//     rpcUrl: item.rpcUrl || null,
//     sandboxId: item.sandboxId || null,
//     transactions: Array.isArray(item.deployments?.transactions)
//       ? item.deployments.transactions
//           .filter((tx) => tx.contractName && tx.hash && tx.contractAddress) // Filter out incomplete transactions
//           .map((tx) => ({
//             contractName: tx.contractName,
//             hash: tx.hash,
//             contractAddress: tx.contractAddress,
//           }))
//       : [], // Default to an empty array if transactions are missing
//   }));
// };

// /**
//  * Sends deployment notification to the backend service
//  * @param {Object} deploymentData - The deployment data to send
//  */
// async function sendNotificationToBackend(deploymentData) {
//   try {
//     const githubActionUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;
//     // Use BUILDBEAR_BASE_URL if it exists, otherwise use the hard-coded URL
//     const baseUrl =
//       process.env.BUILDBEAR_BASE_URL || "https://api.buildbear.io";
//     const notificationEndpoint = `${baseUrl}/ci/deployment-notification`;

//     let status = deploymentData.status;
//     let summary = deploymentData.summary ?? "";
//     let deployments = [];

//     // Process deployment data if not "deployment started" or already "failed"
//     if (status !== "deployment started" && status !== "failed") {
//       // Extract contract data
//       deployments = extractContractData(deploymentData.deployments);

//       // Validate deployment success
//       const validation = validateDeployment(deployments);

//       if (!validation.valid) {
//         // Update status to failed if validation fails
//         status = "failed";
//         summary = validation.message;
//       }
//     }

//     const payload = {
//       repositoryName: github.context.repo.repo,
//       repositoryOwner: github.context.repo.owner,
//       actionUrl: githubActionUrl,
//       commitHash: github.context.sha,
//       workflow: github.context.workflow,
//       status: status,
//       summary: summary,
//       deployments: deployments,
//       timestamp: new Date().toISOString(),
//     };

//     await axios.post(notificationEndpoint, payload);

//     // If the status was changed to failed, we should fail the GitHub Action
//     if (status === "failed" && deploymentData.status !== "failed") {
//       core.setFailed(summary);
//     }
//   } catch (error) {
//     // Don't throw error to prevent action failure due to notification issues
//   }
// }

// /**
//  * Validates if deployment was successful by checking if any valid transactions exist
//  * @param {Array} extractedData - Data extracted from deployments
//  * @returns {Object} - Validation result with status and message
//  */
// const validateDeployment = (extractedData) => {
//   // Check if we have any valid transactions across all deployments
//   const hasValidTransactions = extractedData.some(
//     (deployment) =>
//       deployment.transactions && deployment.transactions.length > 0,
//   );

//   if (!hasValidTransactions) {
//     return {
//       valid: false,
//       message:
//         "No contract deployments found. All transactions are missing required data.",
//     };
//   }

//   return {
//     valid: true,
//     message: "Deployment successful",
//   };
// };

(async () => {
  try {
    const attempt = process.env.GITHUB_RUN_ATTEMPT
    console.log("Job:", github.context.job);
    console.log("Attempt Number:", attempt);
  } catch (error) {
    // let deploymentNotificationData = {
    //   status: "failed",
    //   summary: `Deployment failed`,
    //   deployments: [],
    // };
    // await sendNotificationToBackend(deploymentNotificationData);

    // core.setFailed(error.message);
  }
})();
