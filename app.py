import copy
from flask import Flask, jsonify, render_template, request
import json

app = Flask(__name__)


recipes = [
    {
        "recipe": "Cookie",
        "steps": [
            {"id": 1, "task": "Mix the dry ingredients", "time": 2, "prerequisites": [], "occupies_chef": True},
            {"id": 2, "task": "Allow the butter and egg to reach room temperature", "time": 10, "prerequisites": [], "occupies_chef": False},
            {"id": 3, "task": "Mix the butter, sugar, egg, and vanilla in a bowl", "time": 3, "prerequisites": [2], "occupies_chef": True},
            {"id": 4, "task": "Combine the dry and wet ingredients", "time": 5, "prerequisites": [1, 3], "occupies_chef": True},
            {"id": 5, "task": "Add the chocolate chips", "time": 1, "prerequisites": [4], "occupies_chef": True},
            {"id": 6, "task": "Chill the dough", "time": 60, "prerequisites": [5], "occupies_chef": False},
            {"id": 7, "task": "Roll the dough into balls", "time": 10, "prerequisites": [6], "occupies_chef": True},
            {"id": 8, "task": "Preheat the oven", "time": 15, "prerequisites": [], "occupies_chef": False},
            {"id": 9, "task": "Bake the cookies", "time": 15, "prerequisites": [7, 8], "occupies_chef": False}
        ]
    },
    {
        "recipe": "Cake",
        "steps": [
            {"id": 1, "task": "Mix the flour and sugar", "time": 3, "prerequisites": [], "occupies_chef": True},
            {"id": 2, "task": "Let the butter melt", "time": 8, "prerequisites": [], "occupies_chef": False},
            {"id": 3, "task": "Beat the eggs", "time": 4, "prerequisites": [], "occupies_chef": True},
            {"id": 4, "task": "Combine all ingredients", "time": 6, "prerequisites": [1, 2, 3], "occupies_chef": True},
            {"id": 5, "task": "Let the dough rest", "time": 30, "prerequisites": [4], "occupies_chef": False},
            {"id": 6, "task": "Preheat the oven", "time": 10, "prerequisites": [], "occupies_chef": False},
            {"id": 7, "task": "Bake the cake", "time": 40, "prerequisites": [5, 6], "occupies_chef": False}
        ]
    },
    {
        "recipe": "Grilled Cheese Sandwich",
        "steps": [
            {"id": 1, "task": "Butter the bread slices", "time": 2, "prerequisites": [], "occupies_chef": True},
            {"id": 2, "task": "Heat the pan", "time": 5, "prerequisites": [], "occupies_chef": False},
            {"id": 3, "task": "Place cheese between bread slices", "time": 1, "prerequisites": [1], "occupies_chef": True},
            {"id": 4, "task": "Grill the sandwich", "time": 4, "prerequisites": [2, 3], "occupies_chef": True},
            {"id": 5, "task": "Flip and grill the other side", "time": 2, "prerequisites": [4], "occupies_chef": True},
        ]
    },
    {
        "recipe": "Lasagna",
        "steps": [
            {"id": 1, "task": "Cook the ground beef", "time": 10, "prerequisites": [], "occupies_chef": True},
            {"id": 2, "task": "Prepare the tomato sauce", "time": 15, "prerequisites": [1], "occupies_chef": True},
            {"id": 3, "task": "Boil the lasagna noodles", "time": 8, "prerequisites": [], "occupies_chef": False},
            {"id": 4, "task": "Mix ricotta cheese with herbs", "time": 5, "prerequisites": [], "occupies_chef": True},
            {"id": 5, "task": "Layer noodles, sauce, and cheese", "time": 20, "prerequisites": [2, 3, 4], "occupies_chef": True},
            {"id": 6, "task": "Preheat the oven", "time": 15, "prerequisites": [], "occupies_chef": False},
            {"id": 7, "task": "Bake the lasagna", "time": 45, "prerequisites": [5, 6], "occupies_chef": False},
            {"id": 8, "task": "Let the lasagna cool", "time": 10, "prerequisites": [7], "occupies_chef": False}
        ]
    }
]

def calculate_time(steps, optimal=True):
    steps_copy = copy.deepcopy(steps)
    chef_busy_until = 0

    # normal zaman hesaplama
    if not optimal:
        steps_copy[0]['start'] = 0
        steps_copy[0]['end'] = steps_copy[0]['time']

        for i in range(1, len(steps_copy)):
            current_step = steps_copy[i]
            previous_step = steps_copy[i - 1]

            current_step['start'] = previous_step['end']
            current_step['end'] = current_step['start'] + current_step['time']

        total_time = max(step['end'] for step in steps_copy)
        return total_time, steps_copy

    # optimal zaman hesaplama
    for i in range(0, len(steps_copy)):
        steps_copy[i]['start'] = 0
        steps_copy[i]['end'] = 0

        # prerequisites kontrolü
        if steps_copy[i]['prerequisites']:
            steps_copy[i]['start'] = max([steps_copy[pre - 1]['end'] for pre in steps_copy[i]['prerequisites']])
        else:
            if steps_copy[i]['id'] > 1 and steps_copy[i]['occupies_chef'] == False:
                steps_copy[i]['start'] = max(steps_copy[i-1]['end'] - steps_copy[i]['time'], 0)

        if steps_copy[i]['occupies_chef']:
            steps_copy[i]['start'] = max(steps_copy[i]['start'], chef_busy_until)
            chef_busy_until = steps_copy[i]['start'] + steps_copy[i]['time']

        steps_copy[i]['end'] = steps_copy[i]['start'] + steps_copy[i]['time']

    total_time = max(step['end'] for step in steps_copy)
    return total_time, steps_copy


# main page
@app.route('/')
def index():
    return render_template('index.html', recipes=recipes)


@app.route('/add-recipe', methods=['POST'])
def add_recipe():
    new_recipe = request.json
    recipes.append(new_recipe)
    return jsonify({"success": True})


@app.route("/calculate/<int:recipe_id>")
def calculate(recipe_id):
    recipe = recipes[recipe_id]
    total_optimal_time, steps_optimal = calculate_time(recipe['steps'], optimal=True)
    total_normal_time, steps_normal = calculate_time(recipe['steps'], optimal=False)  # steps_copy'yi geri döndür

    return jsonify({
        "recipe": recipe['recipe'], 
        "total_optimal_time": total_optimal_time, 
        "total_normal_time": total_normal_time, 
        "steps_optimal": steps_optimal,
        "steps_normal": steps_normal  
    }), 200


@app.route("/recipes/", defaults={"recipe_id": None, "steps": False})
@app.route("/recipes/<int:recipe_id>/", defaults={"steps": False})
@app.route("/recipes/<int:recipe_id>/steps", defaults={"steps": True})
def show_recipes(recipe_id, steps):
    if recipe_id is None:
        return jsonify(recipes), 200
    elif steps:
        return jsonify(recipes[recipe_id]['steps']), 200
    else:
        return jsonify(recipes[recipe_id]), 200


if __name__ == '__main__':
    app.run(debug=True)