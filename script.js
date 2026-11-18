// pet name and starting stat values
var pet_info = {
  name: "Kit-Kat",
  weight: 70,
  energy: 70,
  sleep: 70,
  happiness: 70,
};
var statNames = ["weight", "energy", "sleep", "happiness"];
var home = { left: "50%", top: "72%" };
var busy = false;
var actionNumber = 0;
var $pet, $image;

var poses = {
  sit: "kitkatSit.png",
  stand: "kitkatStand.png",
  left: "kitkatLeft.png",
  right: "kitkatRight.png",
  play: "kitkatPlay.png",
  workout: "kitkatWorkout.png",
  sleep: "kitkatSleep.png",
};

// x and y give each task's position as percentages of the room
// changes follow this order: weight, energy, sleep, happiness
var activities = {
  treat: { x: 62, y: 60, pose: "stand", changes: [12, 8, 0, 5] },
  play: { x: 53, y: 83, pose: "play", changes: [-3, -12, -5, 15] },
  exercise: { x: 28, y: 61, pose: "workout", changes: [-7, -20, -10, -5] },
  sleep: { x: 82, y: 46, pose: "sleep", changes: [-3, 20, 30, 5] },
};

$(function () {
  $pet = $("#pet");
  $image = $("#pet-image");
  $("#pet-name").text(pet_info.name);
  updateStats();

  // handle clicks on the action buttons and room props
  $("[data-action]").on("click", function () {
    startAction($(this).attr("data-action"));
  });
  $("#reset").on("click", resetPet);
  $("#scene").on("dragstart", function (event) {
    event.preventDefault();
  });

  // load the cat images before an action uses them
  Object.keys(poses).forEach(function (pose) {
    var image = new Image();
    image.src = "images/" + poses[pose];
  });
});

// skip animation time when reduced motion is enabled
function duration(ms) {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}

// change the image and the pose used by the css
function setPose(pose) {
  $pet.attr("data-pose", pose);
  $image.attr({ src: "images/" + poses[pose], alt: "Kit-Kat: " + pose });
}

// lock the action controls while a trip is running
function setBusy(value) {
  busy = value;
  $("[data-action]").prop("disabled", value);
}

function updateStats() {
  // keep every stat within 0 to 100, then update its number and meter
  statNames.forEach(function (stat) {
    pet_info[stat] = Math.max(0, Math.min(100, pet_info[stat]));
    $("#" + stat + "-value").text(pet_info[stat]);
    $("#" + stat).val(pet_info[stat]);
  });
}

function getRejection(action) {
  if (action === "treat") {
    return pet_info.weight >= 95 ? "Full. Exercise." : "";
  }
  if (action === "sleep") {
    if (pet_info.weight < 5) return "Hungry. Eat first.";
    if (pet_info.sleep >= 95 && pet_info.energy >= 95)
      return "Rested. Play or exercise.";
    return "";
  }

  // exercise needs more food and rest than playing does
  var exercise = action === "exercise";
  if (pet_info.weight < (exercise ? 15 : 5)) return "Hungry. Eat.";
  if (pet_info.energy < (exercise ? 25 : 15))
    return "Low energy. Eat or sleep.";
  if (pet_info.sleep < (exercise ? 20 : 10)) return "Tired. Sleep.";
  return "";
}

function startAction(action) {
  if (busy || !activities[action]) return;
  var task = activities[action];
  var rejection = getRejection(action);
  var thisAction = ++actionNumber;
  setBusy(true);
  $("#message").text(rejection || "Fine.");

  if (rejection) {
    // wait for the short shake; rejected actions do not change stats
    setPose("stand");
    $image.addClass("shake");
    $pet.delay(duration(450));
  } else {
    setPose(task.x < 50 ? "left" : "right");
    $image.addClass("bob");

    // one second out, two seconds doing the task, one second home
    $pet
      .animate({ left: task.x + "%", top: task.y + "%" }, duration(1000))
      .queue(function (next) {
        setPose(task.pose);
        next(); // let the next queued step begin
      })
      .delay(duration(2000))
      .queue(function (next) {
        setPose(task.x < 50 ? "right" : "left");
        next();
      })
      .animate(home, duration(1000));
  }

  // wait until the queued movement and delays finish
  $pet.promise().done(function () {
    // ignore the result if reset canceled this action
    if (thisAction !== actionNumber) return;
    $image.removeClass("bob shake");
    $pet.css(home);
    setPose("sit");
    if (!rejection) {
      statNames.forEach(function (stat, index) {
        pet_info[stat] += task.changes[index];
      });
      updateStats();
      $("#message").text("Done.");
    }
    setBusy(false);
  });
}

function resetPet() {
  // mark the action as canceled before clearing its queue
  actionNumber += 1;

  // remove waiting steps, then stop the step currently running
  $pet.clearQueue().stop();
  $image.removeClass("bob shake");
  $pet.css(home);
  setPose("sit");
  statNames.forEach(function (stat) {
    pet_info[stat] = 70;
  });
  updateStats();
  setBusy(false);
  $("#message").text("Ready.");
}
