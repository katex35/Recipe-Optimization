document.getElementById('add-new-recipe').addEventListener('click', function (e) {
    e.preventDefault();

    const form = document.getElementById('new-recipe-form');
    if (stepId === 1) addNewStep();

    form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
});

let stepId = 1;
const chefIconURL = 'https://cdn-icons-png.flaticon.com/512/3461/3461974.png';

function getChefIcon() {
    return `<img src="${chefIconURL}" alt="chef icon" class="chef-icon"/>`;
}


function addNewStep(task = '', time = '', prerequisites = '', occupiesChef = 'false') {
    const newStep = document.createElement('div');
    newStep.classList.add('step-box');
    newStep.setAttribute('data-step-id', stepId);

    newStep.innerHTML = `
        <label>Task:</label>
        <input type="text" name="task" value="${task}" placeholder="Enter task description"><br>
        <label>Time (in minutes):</label>
        <input type="number" name="time" value="${time}" min="0" placeholder="Enter time"><br>
        <label>Prerequisites (space-separated IDs):</label>
        <input type="text" name="prerequisites" value="${prerequisites}" placeholder="Enter prerequisite step IDs" ${stepId === 0 ? 'disabled' : ''}><br>
        <label>Occupies Chef:</label>
        <select name="occupies_chef">
            <option value="true" ${occupiesChef === 'true' ? 'selected' : ''}>Yes</option>
            <option value="false" ${occupiesChef === 'false' ? 'selected' : ''}>No</option>
        </select><br><br>
        <button class="remove-step">Remove Step</button>
    `;

    document.getElementById('recipe-steps').appendChild(newStep);

    newStep.querySelector('.remove-step').addEventListener('click', function () {
        removeStep(newStep);
    });

    stepId++;
}

function removeStep(stepElement) {
    const stepContainer = document.getElementById('recipe-steps');
    stepContainer.removeChild(stepElement);

    const remainingSteps = stepContainer.querySelectorAll('.step-box');
    remainingSteps.forEach((step, index) => step.setAttribute('data-step-id', index + 1));

    stepId--;
}

document.getElementById('create-recipe').addEventListener('click', function (e) {
    e.preventDefault();

    const steps = [];
    const stepElements = document.querySelectorAll('.step-box');
    let valid = true;

    if (stepElements.length < 2) {
        alert("You must have at least 2 steps in the recipe.");
        return;
    }

    stepElements.forEach(function (stepElement) {
        const taskInput = stepElement.querySelector('input[name="task"]');
        const timeInput = stepElement.querySelector('input[name="time"]');
        const prerequisitesInput = stepElement.querySelector('input[name="prerequisites"]');

        // clearing every error to show new ones
        [taskInput, timeInput, prerequisitesInput].forEach(input => {
            input.classList.remove('error');
            input.style.animation = 'none';
        });

        const errorMessage = stepElement.querySelector('.error-message');
        if (errorMessage) errorMessage.style.display = 'none';
    });

    stepElements.forEach(function (stepElement, index) {
        const stepId = index + 1;
        const taskInput = stepElement.querySelector('input[name="task"]');
        const timeInput = stepElement.querySelector('input[name="time"]');
        const prerequisitesInput = stepElement.querySelector('input[name="prerequisites"]');
        const occupiesChef = stepElement.querySelector('select[name="occupies_chef"]').value === 'true';

        const task = taskInput.value.trim();
        const time = parseInt(timeInput.value);

        let errorMessage = stepElement.querySelector('.error-message');
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            stepElement.appendChild(errorMessage);
        }

        if (!task) {
            showError(taskInput, `Task description for step ${stepId} cannot be empty.`, errorMessage);
            valid = false;
            return;
        }

        if (isNaN(time) || time < 0) {
            showError(timeInput, `Time for step ${stepId} must be a valid non-negative number.`, errorMessage);
            valid = false;
            return;
        }

        if (stepId === 1 && prerequisitesInput.value.trim()) {
            showError(prerequisitesInput, "First step cannot have prerequisites.", errorMessage);
            valid = false;
            return;
        }

        let prerequisiteArray = [];
        if (prerequisitesInput.value.trim()) {
            prerequisiteArray = prerequisitesInput.value.trim().split(' ').map(Number).filter(n => !isNaN(n));

            for (const pre of prerequisiteArray) {
                if (pre >= stepId || pre === 0) {
                    showError(prerequisitesInput, `Invalid prerequisite step ID: ${pre}. Must be less than the current step and not zero.`, errorMessage);
                    valid = false;
                    return;
                }
            }
        }

        steps.push({
            id: stepId,
            task: task,
            time: time,
            prerequisites: prerequisiteArray,
            occupies_chef: occupiesChef
        });
    });

    if (valid) {
        const recipeNameInput = document.getElementById('recipe-name').value;
        const recipeName = recipeNameInput || `Custom Recipe ${recipes.length}`;

        const newRecipe = {
            recipe: recipeName,
            steps: steps
        };

        recipes.push(newRecipe);

        fetch('/add-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecipe)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('New recipe added successfully!');
                location.reload();
            } else {
                alert('Failed to add the recipe.');
            }
        });
    }
});

function showError(input, message, errorMessage) {
    input.classList.add('error');
    errorMessage.innerText = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
        input.style.animation = 'shake 0.3s';
    }, 10);
}


// calculate on button click
document.querySelectorAll('.recipe-link').forEach(function (element) {
    element.addEventListener('click', function (event) {
        event.preventDefault();
        const recipeId = event.target.getAttribute('data-recipe-id');
        calculateOptimal(recipeId);
    });
});

function calculateOptimal(recipeId) {
    fetch('/calculate/' + recipeId)
        .then(response => response.json())
        .then(data => {
            document.getElementById('optimal-time').style.display = 'block';
            document.getElementById('normal-time').style.display = 'block';

            document.getElementById('optimal-time').innerText = `Optimal cooking time for ${data.recipe}: ${data.total_optimal_time} minutes`;
            document.getElementById('normal-time').innerText = `Normal cooking time for ${data.recipe}: ${data.total_normal_time} minutes`;

            updateTaskLists(data);
        })
        .catch(error => console.log("Error fetching optimal time:", error));
}

function updateTaskLists(data) {
    const normalTaskList = document.getElementById('normal-task-list');
    const optimalTaskList = document.getElementById('optimal-task-list');
    normalTaskList.innerHTML = '';
    optimalTaskList.innerHTML = '';

    data.steps_optimal.forEach((optimalStep, index) => {
        const normalStep = data.steps_normal[index];

        // highlith and create
        const optimalListItem = createTaskListItem(optimalStep, normalStep, data.steps_optimal);
        const normalListItem = createTaskListItem(normalStep, normalStep, data.steps_normal);

        optimalTaskList.appendChild(optimalListItem);
        normalTaskList.appendChild(normalListItem);
    });
}

// create list item as it written
function createTaskListItem(step, compareStep, allSteps) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `${step.occupies_chef ? getChefIcon() : ''} ${step.task} (Start: ${highlightDifference(compareStep.start, step.start)}, End: ${highlightDifference(compareStep.end, step.end)})`;

    if (step.prerequisites && step.prerequisites.length > 0) {
        const prerequisitesDiv = document.createElement('div');
        prerequisitesDiv.className = 'prerequisites';
        const prerequisitesNames = step.prerequisites.map(p => getTaskNameById(p, allSteps));
        prerequisitesDiv.innerHTML = `Prerequisites: ${prerequisitesNames.join(', ')}`;
        listItem.appendChild(prerequisitesDiv);
    }

    return listItem;
}

// normal and optimal diff highlight
function highlightDifference(normalValue, optimalValue) {
    return normalValue !== optimalValue ? `<span class="time-difference">${optimalValue}</span>` : optimalValue;
}


// get task name
function getTaskNameById(taskId, allTasks) {
    const task = allTasks.find(t => t.id === taskId);
    return task ? task.task : taskId;
}

document.getElementById('add-step').addEventListener('click', function (e) {
    e.preventDefault();
    addNewStep();
});



document.getElementById('use-template').addEventListener('click', function (e) {
    e.preventDefault();
    useTemplate(); 
});


function useTemplate() {
    document.getElementById('recipe-steps').innerHTML = '';
    stepId = 1;

    const menemenRecipe = [
        { task: "Soğanları Doğra", time: 5, prerequisites: "", occupiesChef: "true" },
        { task: "Biberleri Doğra", time: 4, prerequisites: "", occupiesChef: "true" },
        { task: "Domatesleri Doğra", time: 3, prerequisites: "", occupiesChef: "true" },
        { task: "Yağı Isıt", time: 2, prerequisites: "1", occupiesChef: "false" },
        { task: "Soğan ve Biberi Kavur", time: 6, prerequisites: "1 2", occupiesChef: "true" },
        { task: "Domatesleri Ekle ve Pişir", time: 8, prerequisites: "3 5", occupiesChef: "true" },
        { task: "Yumurtaları Ekle ve Karıştır", time: 4, prerequisites: "6", occupiesChef: "true" }
    ];

    menemenRecipe.forEach(step => addNewStep(step.task, step.time, step.prerequisites, step.occupiesChef));

    document.getElementById('recipe-name').value = "Menemen";
}