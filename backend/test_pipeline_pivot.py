from fastapi.testclient import TestClient
from app.main import app

def test_pipeline():
    client = TestClient(app)

    # 1. Test Candidate Grid Endpoint
    res_grid = client.get('/api/optimization/candidate-grid')
    assert res_grid.status_code == 200, f'Grid failed: {res_grid.text}'
    cams = res_grid.json()
    print(f'1. Candidate Grid Endpoint Success: {len(cams)} candidates generated.')
    assert len(cams) == 121, f'Expected 121 candidates, got {len(cams)}'
    assert cams[0]['position'][1] == 2.5, f'Expected height 2.5m, got {cams[0]}'
    assert cams[0]['rotation'][0] == -30.0, f'Expected pitch -30, got {cams[0]}'

    # 2. Test Set Cover Optimization Endpoint with programmatic grid
    res_opt = client.post('/api/optimization/set-cover', json={
        'voxel_resolution': 1.0,
        'desired_coverage_pct': 95.0,
        'max_cameras_allowed': 6,
        'bounds_min': [-5.0, 0.0, -5.0],
        'bounds_max': [5.0, 2.5, 5.0]
    })
    assert res_opt.status_code == 200, f'Optimization failed: {res_opt.text}'
    opt_data = res_opt.json()
    selected_count = len(opt_data['selected_cameras'])
    print(f"2. Set Cover Success: {selected_count} optimal cameras selected, coverage: {opt_data['coverage_percentage']}%, execution_time: {opt_data['execution_time_ms']}ms")
    assert selected_count == 6, f'Expected 6 selected cameras, got {selected_count}'

    # 3. Test Colmap candidates fallback
    res_colmap = client.get('/api/colmap/candidates')
    assert res_colmap.status_code == 200
    print(f"3. COLMAP candidate endpoint redirected: {len(res_colmap.json())} poses.")

    print("\n>>> ALL BACKEND ALGORITHM TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_pipeline()
