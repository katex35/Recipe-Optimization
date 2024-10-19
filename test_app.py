import pytest
import json
from app import app, calculate_time  # app and calculate_time func

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_calculate_time(client):
    recipe_id = 0  # test cookie, index 0
    response = client.get(f'/calculate/{recipe_id}')
    
    assert response.status_code == 200  # response başarılı mı

    data = response.get_json()

    # recipe adı cookie mi?
    assert data['recipe'] == 'Cookie'
    
    # normal ve optimal süre kontrol
    assert data['total_normal_time'] == 121  
    assert data['total_optimal_time'] == 104  

    steps_normal = data['steps_normal']
    steps_optimal = data['steps_optimal']

    # start end doğru mu?
    assert steps_normal[0]['start'] == 0
    assert steps_normal[0]['end'] == 2  

    assert steps_normal[1]['start'] == 2
    assert steps_normal[1]['end'] == 12  


    assert steps_optimal[0]['start'] == 0
    assert steps_optimal[0]['end'] == 2  

    assert steps_optimal[1]['start'] == 0  
    assert steps_optimal[1]['end'] == 10  


def test_add_recipe(client):
    new_recipe = {
        "recipe": "Test Recipe",
        "steps": [
            {"id": 1, "task": "Test Step 1", "time": 5, "prerequisites": [], "occupies_chef": True}
        ]
    }

    response = client.post('/add-recipe', data=json.dumps(new_recipe), content_type='application/json')
    assert response.status_code == 200

    data = response.get_json()
    assert data['success'] == True

    # check if status 200
    response = client.get('/recipes/')
    assert response.status_code == 200

    recipes = response.get_json()
    assert recipes[-1]['recipe'] == "Test Recipe"  # is recipe added?