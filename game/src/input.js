// Lantern Duel — mouse and keyboard, read through one delegated listener on
// the stage so the renderer's rebuilds never drop a handler. Every gesture
// becomes one of the controller's named intents; this file decides nothing
// about the rules.
export function createInput(stage, hooks) {
  stage.addEventListener('click', (event) => {
    const target = event.target;

    const button = target.closest('button');
    if (button) {
      if (button.id === 'end-turn') hooks.onEndTurn();
      else if (button.id === 'begin-btn') hooks.onBegin();
      else if (button.id === 'again-btn') hooks.onPlayAgain();
      else if (button.id === 'help-btn') hooks.onHelp();
      else if (button.id === 'restart-btn') hooks.onRestart();
      return;
    }

    const foeLantern = target.closest('[data-lantern="foe"]');
    if (foeLantern) {
      hooks.onFoeLantern();
      return;
    }

    const foeCard = target.closest('#foe-board .card');
    if (foeCard) {
      hooks.onFoeMinion(Number(foeCard.dataset.uid));
      return;
    }

    const myCard = target.closest('#my-board .card');
    if (myCard) {
      hooks.onMyMinion(Number(myCard.dataset.uid));
      return;
    }

    const handCard = target.closest('#my-hand .card');
    if (handCard) {
      hooks.onHandCard(Number(handCard.dataset.uid));
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Escape') {
      hooks.onCancel();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hooks.onConfirm();
      return;
    }
    const digit = Number.parseInt(event.key, 10);
    if (digit >= 1 && digit <= 9) hooks.onHandNumber(digit);
  });
}
