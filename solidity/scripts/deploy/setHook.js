const { contractAt, sendTxn } = require('../shared/helpers');
async function main() {
  const mailBoxAddress = '0x5a9D9ac43670568f6C466e7913b36e460BB4F219'; // Must change
  const mailBox = await contractAt('MailBox', mailBoxAddress);
  // Value that return from step 3 in deployIPG.js
  const defaultHook = '0x5a9D9ac43670568f6C466e7913b36e460BB4F219'; // Must change
  await sendTxn(mailBox.setDefaultHook(defaultHook), 'mailBox.setDefaultHook');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
