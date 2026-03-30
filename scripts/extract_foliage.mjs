import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const io = new NodeIO();
const inputFile = path.resolve('public/models/tropical_plants/tropical_plants_pack_m02p.glb');
const outputDir = path.resolve('public/models/foliage');

const targetNodes = {
  palm_tree_1: 'SM_MZRa_Palm_B081',
  palm_tree_2: 'SM_MZRa_Palm_B082',
  palm_tree_3: 'SM_MZRa_Palm_B083',
  banana_1: 'SM_MZRa_Banana_B091',
  banana_2: 'SM_MZRa_Banana_B092',
  fern_1: 'SM_MZRa_Fern_B0532',
  fern_2: 'SM_MZRa_Fern_B0512',
  fern_3: 'SM_MZRa_Fern_B0522',
  monstera_1: 'tree.007SM_MZRa_Monstera_B072',
  monstera_2: 'tree.006SM_MZRa_Monstera_B071'
};

async function extract() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseDoc = await io.read(inputFile);
  
  for (const [outputName, nodeName] of Object.entries(targetNodes)) {
    console.log(`Extracting ${outputName} from ${nodeName}...`);
    // Create a deep copy of the document so we don't modify the base
    const doc = await io.read(inputFile);
    
    // Find the node we want to keep
    const rootNode = doc.getRoot().listNodes().find(n => n.getName() === nodeName);
    if (!rootNode) {
        console.error(`Node ${nodeName} not found!`);
        continue;
    }

    // Keep only the target hierarchy in the default scene
    const defaultScene = doc.getRoot().listScenes()[0];
    defaultScene.listChildren().forEach(n => defaultScene.removeChild(n));
    defaultScene.addChild(rootNode);

    // Run prune to remove all unused meshes, materials, and textures
    await doc.transform(prune());
    
    const outPath = path.join(outputDir, `${outputName}.glb`);
    await io.write(outPath, doc);
    console.log(`Saved ${outputName}.glb`);
  }
}

extract().catch(console.error);
