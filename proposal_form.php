<?php 
// 1. Include your actual site header to get the exact menu, logo, and style.css
$page_title = 'Generate Proposal - SparkGrid';
$current_page = 'proposal_form.php';
include 'header.php'; 
?>

<style>
    /* Styling the form card to match the site's aesthetic */
    .form-card {
        background-color: #fff; 
        border-radius: 10px;
        box-shadow: 8px 8px 20px rgba(0, 0, 0, 0.08); 
        padding: 40px;
        margin-top: 30px; /* Pulls the form up slightly over the hero banner */
        position: relative;
        z-index: 10;
    }
    .form-card input, .form-card select {
        border-radius: 20px; /* Matching the rounded inputs from your callback form */
        height: 45px;
        padding: 10px 20px;
        font-size: 14px;
        margin-bottom: 25px;
        border: 1px solid #eee;
        background-color: #f9f9f9;
        width: 100%;
        color: #6a6a6a;
    }
    .form-card input:focus, .form-card select:focus {
        outline: none;
        border-color: #a4c639; /* SparkGrid Green */
        background-color: #fff;
    }
    .form-label {
        font-weight: 600;
        color: #1e1e1e;
        margin-bottom: 10px;
        font-size: 14px;
        display: block;
    }
    /* Adapting your filled-button specifically for form submission */
    button.submit-button {
        background-color: #a4c639;
        color: #fff;
        border: 2px solid #a4c639;
        font-size: 14px;
        text-transform: uppercase;
        font-weight: 700;
        padding: 14px 30px;
        border-radius: 30px;
        display: inline-block;
        transition: all 0.3s;
        cursor: pointer;
        width: 100%;
    }
    button.submit-button:hover {
        background-color: #fff;
        color: #a4c639;
    }
</style>

<div class="page-heading header-text">
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        <h1>Client Proposal</h1>
        <span>Generate 25-Year Captive Solar Projections</span>
      </div>
    </div>
  </div>
</div>

<div class="services mb-5" style="margin-top: 0; padding-bottom: 100px;">
  <div class="container">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div class="form-card">
                
                <div class="section-heading" style="text-align: left; margin-bottom: 40px;">
                    <h2>Input <em>Client Data</em></h2>
                </div>
                
                <form action="generate_pdf.php" method="POST">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">1. Proposal For (Company/Name)*</label>
                            <input type="text" name="proposal_for" required placeholder="e.g., M/s ABC">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">2. Location / Address*</label>
                            <input type="text" name="address" required placeholder="e.g., XYZ">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">3. Sanctioned Load (kW)*</label>
                            <input type="number" step="0.01" name="totalload" required placeholder="e.g., 1000">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">4. Monthly Avg. Consumption*</label>
                            <input type="number" step="0.01" name="monthly_consumption" required placeholder="Units/Mo">
                        </div>
                    </div>

                    <hr style="border-top: 1px solid #eee; margin: 10px 0 30px 0;">
					<div class="row mb-3">
						<div class="col-md-12">
							<label class="form-label">6. Client Email Address (Optional)</label>
							<input type="email" name="client_email" placeholder="client@example.com (Leave blank to only download PDF without emailing)">
							</div>
					</div>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Industry Sector*</label>
                            <select name="i_type">
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Other">Other / Commercial</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Base Unit Cost (₹)*</label>
                            <input type="number" step="0.01" name="unitcost" value="6.96" required style="margin-bottom: 5px;">
                            <p style="font-size: 12px; margin-bottom: 25px; margin-left: 15px;">Excluding ED & Fixed Charges</p>
                        </div>
                    </div>

                    <div class="row mt-2">
                        <div class="col-md-12">
                            <button type="submit" class="submit-button">Generate Proposal</button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    </div>
  </div>
</div>

<?php 
// 4. Include your actual site footer
include 'footer.php'; 
?>