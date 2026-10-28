/* ---------- PART 1: Clubs, search and filters ---------- */

// Sample data (fictional)
const clubs = [
  { name: "Code Crew", category: "Tech", description: "Weekly coding sessions and mini hackathons for all levels." },
  { name: "Robo Workshop", category: "Tech", description: "Build robots with Arduino and sensors from scratch." },
  { name: "Pixel Studio", category: "Creative", description: "Digital art, game design and animation meetups." },
  { name: "Drama Society", category: "Creative", description: "Stage plays, street acts and improv nights." },
  { name: "Campus FC", category: "Sports", description: "Football practice and inter-college matches." },
  { name: "Trail Walkers", category: "Sports", description: "Weekend treks and fitness challenges around the city." }
];

const clubList = document.getElementById("club-list");
const searchInput = document.getElementById("search");
const noResults = document.getElementById("no-results");
const filterButtons = document.querySelectorAll(".filter");

let selectedCategory = "All";
let visibleClubNames = [];
let hoveredClubName = "";

// Show only the clubs that match BOTH the search text and the category
function showClubs() {
  const searchText = searchInput.value.toLowerCase();

  const matchingClubs = clubs.filter(function (club) {
    const textMatches = (club.name + " " + club.description).toLowerCase().includes(searchText);
    const categoryMatches = selectedCategory === "All" || club.category === selectedCategory;
    return textMatches && categoryMatches;
  });

  clubList.innerHTML = matchingClubs.map(function (club) {
    return `<article class="card ${club.category.toLowerCase()}" tabindex="0" data-name="${club.name}">
      <span class="badge">${club.category}</span>
      <h3>${club.name}</h3>
      <p>${club.description}</p>
    </article>`;
  }).join("");

  visibleClubNames = matchingClubs.map(function (club) { return club.name; });
  noResults.hidden = matchingClubs.length > 0;
}

searchInput.addEventListener("input", showClubs);

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    selectedCategory = button.dataset.category;
    filterButtons.forEach(function (other) {
      const isSelected = other === button;
      other.classList.toggle("active", isSelected);
      other.setAttribute("aria-pressed", isSelected);
    });
    showClubs();
  });
});

showClubs();

/* ---------- PART 2: Event details (click to reveal) ---------- */

document.querySelectorAll(".event-button").forEach(function (button) {
  button.addEventListener("click", function () {
    const details = button.nextElementSibling;
    details.hidden = !details.hidden;
    button.textContent = details.hidden ? "Show details" : "Hide details";
    button.setAttribute("aria-expanded", !details.hidden);
  });
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Hover a card: its tower grows. Move the mouse: the cards tilt. ---------- */

clubList.addEventListener("mouseover", function (event) {
  const card = event.target.closest(".card");
  hoveredClubName = card ? card.dataset.name : "";
});
clubList.addEventListener("mouseleave", function () { hoveredClubName = ""; });
clubList.addEventListener("focusin", function (event) { hoveredClubName = event.target.dataset.name || ""; });
clubList.addEventListener("focusout", function () { hoveredClubName = ""; });

document.addEventListener("mousemove", function (event) {
  document.documentElement.style.setProperty("--mx", event.clientX + "px");
  document.documentElement.style.setProperty("--my", event.clientY + "px");
  const card = event.target.closest(".card");
  if (!card || reduceMotion) return;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  card.style.transform = "perspective(600px) rotateY(" + x * 12 + "deg) rotateX(" + -y * 12 + "deg) translateY(-4px)";
});
document.addEventListener("mouseout", function (event) {
  const card = event.target.closest(".card");
  if (card && !card.contains(event.relatedTarget)) card.style.transform = "";
});

/* ---------- Three.js: one glowing tower per club on a hexagon platform ---------- */

const categoryColors = { Tech: 0x19e6ff, Creative: 0xff3df2, Sports: 0xff8a1f };

function startScene() {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.Fog(0x050508, 12, 30);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 6, 12);

  const world = new THREE.Group();
  scene.add(world);

  // Hexagon floor and a thin ring around it
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0x0b0b18 }));
  floor.position.y = -0.1;
  floor.add(new THREE.LineSegments(new THREE.EdgesGeometry(floor.geometry), new THREE.LineBasicMaterial({ color: 0xffffff })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.03, 8, 100), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ring.rotation.x = Math.PI / 2;
  world.add(floor, ring);

  // One tower per club, placed around a circle. The outline colour shows the category.
  const boxShape = new THREE.BoxGeometry(1, 1, 1);
  boxShape.translate(0, 0.5, 0);
  const outlineShape = new THREE.EdgesGeometry(boxShape);
  const towers = clubs.map(function (club, index) {
    const angle = (index / clubs.length) * Math.PI * 2;
    const height = 2.5 + (index % 3) * 0.9;
    const tower = new THREE.Mesh(boxShape, new THREE.MeshBasicMaterial({ color: 0x0b0b18 }));
    const outline = new THREE.LineSegments(outlineShape, new THREE.LineBasicMaterial({ color: categoryColors[club.category], transparent: true }));
    tower.add(outline);
    tower.position.set(Math.cos(angle) * 3.2, 0, Math.sin(angle) * 3.2);
    tower.scale.set(1.1, height, 1.1);
    world.add(tower);
    return { tower: tower, outline: outline, name: club.name, color: categoryColors[club.category], height: height };
  });

  // 200 dots that float upward
  const dotCount = 200;
  const dotPositions = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    dotPositions[i * 3] = (Math.random() - 0.5) * 14;
    dotPositions[i * 3 + 1] = Math.random() * 8;
    dotPositions[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  const dotGeometry = new THREE.BufferGeometry();
  dotGeometry.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
  world.add(new THREE.Points(dotGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));

  // On desktop the camera looks a little to the left, so the scene appears on the right
  let lookX = 0;
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    lookX = window.innerWidth > 900 ? -3 : 0;
  }
  resize();
  window.addEventListener("resize", resize);

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("mousemove", function (event) {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
  });

  function animate() {
    requestAnimationFrame(animate);
    const time = reduceMotion ? 0 : performance.now() * 0.001;
    const scrollRange = document.body.scrollHeight - window.innerHeight;
    const progress = window.scrollY / Math.max(scrollRange, 1);

    // Scrolling spins the whole city half a turn and moves the camera closer
    world.rotation.y = time * 0.15 + progress * Math.PI;
    camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
    camera.position.y += (6 - progress * 2.5 - mouseY * 2 - camera.position.y) * 0.05;
    camera.position.z += (12 - progress * 3 - camera.position.z) * 0.05;
    camera.lookAt(lookX, 1.5, 0);

    // The search results control the towers
    towers.forEach(function (item) {
      const isVisible = visibleClubNames.includes(item.name);
      const isHovered = hoveredClubName === item.name;
      const targetHeight = !isVisible ? 0.2 : isHovered ? item.height * 1.35 : item.height;
      item.tower.scale.y += (targetHeight - item.tower.scale.y) * 0.1;
      item.outline.material.opacity = isVisible ? 1 : 0.25;
      item.outline.material.color.setHex(isHovered ? 0xffffff : item.color);
    });

    // Dots drift upward and restart at the bottom
    if (!reduceMotion) {
      for (let i = 0; i < dotCount; i++) {
        dotPositions[i * 3 + 1] += 0.01;
        if (dotPositions[i * 3 + 1] > 8) dotPositions[i * 3 + 1] = 0;
      }
      dotGeometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  animate();
}

// If WebGL is not available, the site still works without the 3D scene
try {
  startScene();
} catch (error) {
  console.log("3D scene could not start:", error);
}
