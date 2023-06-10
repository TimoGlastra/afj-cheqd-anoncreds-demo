import { AnonCredsModule } from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { AskarModule } from "@aries-framework/askar";
import {
  CheqdDidRegistrar,
  CheqdDidResolver,
  CheqdAnonCredsRegistry,
  CheqdModule,
  CheqdModuleConfig,
  CheqdDidCreateOptions,
} from "@aries-framework/cheqd";
import {
  Agent,
  ConsoleLogger,
  DidsModule,
  LogLevel,
} from "@aries-framework/core";
import { agentDependencies } from "@aries-framework/node";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";

const initializeAgent = async () => {
  const agent = new Agent({
    config: {
      label: "Cheqd Example",
      walletConfig: {
        id: "cheqd-example",
        key: "cheqd-example",
      },
      logger: new ConsoleLogger(LogLevel.debug),
    },
    dependencies: agentDependencies,
    modules: {
      dids: new DidsModule({
        registrars: [new CheqdDidRegistrar()],
        resolvers: [new CheqdDidResolver()],
      }),

      // AnonCreds
      anoncreds: new AnonCredsModule({
        registries: [new CheqdAnonCredsRegistry()],
      }),
      // We need to register the native anoncreds implementation
      anoncredsRs: new AnonCredsRsModule({
        anoncreds,
      }),

      // Add cheqd module
      cheqd: new CheqdModule(
        new CheqdModuleConfig({
          networks: [
            {
              network: "testnet",
              cosmosPayerSeed:
                "sketch mountain erode window enact net enrich smoke claim kangaroo another visual write meat latin bacon pulp similar forum guilt father state erase bright",
            },
          ],
        })
      ),
      askar: new AskarModule({
        ariesAskar,
      }),
    },
  });

  await agent.initialize();

  return agent;
};

const run = async () => {
  console.log("initializing agent...");
  const agent = await initializeAgent();
  console.log("agent initialized");

  const didResult = await agent.dids.create<CheqdDidCreateOptions>({
    method: "cheqd",
    // the secret contains a the verification method type and id
    secret: {
      verificationMethod: {
        id: "key-1",
        type: "Ed25519VerificationKey2020",
      },
    },
    // an optional methodSpecificIdAlgo parameter
    options: {
      network: "testnet",
      methodSpecificIdAlgo: "uuid",
    },
  });

  if (didResult.didState.state !== "finished") {
    throw new Error("Error creating did");
  }

  const schemaResult = await agent.modules.anoncreds.registerSchema({
    schema: {
      attrNames: ["name", "age", "height"],
      name: "schema-1",
      version: "1.0",
      issuerId: didResult.didState.did,
    },
    options: {},
  });

  if (schemaResult.schemaState.state !== "finished") {
    throw new Error("Error registering schema");
  }

  const credentialDefinitionResult =
    await agent.modules.anoncreds.registerCredentialDefinition({
      credentialDefinition: {
        issuerId: didResult.didState.did,
        schemaId: schemaResult.schemaState.schemaId,
        tag: "default",
      },
      options: {},
    });

  if (
    credentialDefinitionResult.credentialDefinitionState.state !== "finished"
  ) {
    throw new Error("Error registering credential definition");
  }

  console.log(
    JSON.stringify(
      credentialDefinitionResult.credentialDefinitionState.credentialDefinition,
      null,
      2
    )
  );
};

run();
