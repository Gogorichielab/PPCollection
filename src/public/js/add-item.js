'use strict';

const addItem = document.querySelector('details.add-item');

document.addEventListener('click', (event) => {
  if (addItem.open && !addItem.contains(event.target)) addItem.open = false;
});

addItem.addEventListener('focusout', (event) => {
  if (event.relatedTarget && !addItem.contains(event.relatedTarget)) addItem.open = false;
});

addItem.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && addItem.open) {
    addItem.open = false;
    addItem.querySelector('summary').focus();
  }
});
