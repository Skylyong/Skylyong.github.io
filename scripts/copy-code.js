(function () {
  function getCodeBlocks() {
    const highlighted = Array.from(document.querySelectorAll('figure.highlight'));
    const plain = Array.from(document.querySelectorAll('pre > code'))
      .map((code) => code.closest('pre'))
      .filter((pre) => pre && !pre.closest('figure.highlight'));
    return highlighted.concat(plain);
  }

  function getText(block) {
    const code = block.querySelector('.code pre') || block.querySelector('code') || block;
    return code.innerText.replace(/\n$/, '');
  }

  function attachButton(block) {
    if (block.querySelector('.copy-button')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code block');

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(getText(block));
        button.textContent = 'Copied';
        button.classList.add('copied');
        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 1400);
      } catch (error) {
        button.textContent = 'Failed';
        window.setTimeout(() => {
          button.textContent = 'Copy';
        }, 1400);
      }
    });

    block.appendChild(button);
  }

  document.addEventListener('DOMContentLoaded', () => {
    getCodeBlocks().forEach((block) => {
      block.classList.add('copyable-code');
      attachButton(block);
    });
  });
})();
