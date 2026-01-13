const btn = document.getElementById("disclaimerBtn");
const content = document.getElementById("disclaimerContent");

btn.addEventListener("click", () => {
  const isOpen = content.classList.toggle("open");

  btn.innerHTML = isOpen ? "Disclaimer ▲" : "Disclaimer ▼";
});
