<?php

require_once 'mail_config.php';
require_once 'dompdf/autoload.inc.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// Helper function to format numbers in Indian Currency Format
function formatIndianCurrency($num)
{
    $num = round($num);
    $explrestunits = "";
    if (strlen((string) $num) > 3) {
        $lastthree = substr((string) $num, strlen((string) $num) - 3, strlen((string) $num));
        $restunits = substr((string) $num, 0, strlen((string) $num) - 3);
        $restunits = (strlen($restunits) % 2 == 1) ? "0" . $restunits : $restunits;
        $expunit = str_split($restunits, 2);
        for ($i = 0; $i < sizeof($expunit); $i++) {
            if ($i == 0) {
                $explrestunits .= (int) $expunit[$i] . ",";
            } else {
                $explrestunits .= $expunit[$i] . ",";
            }
        }
        $thecash = $explrestunits . $lastthree;
    } else {
        $thecash = $num;
    }
    return $thecash;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // --- 1. ACCEPTED DATA (Sanitized) ---
    $proposal_for = htmlspecialchars($_POST['proposal_for'] ?? 'Valued Customer');
    $address = htmlspecialchars($_POST['address'] ?? '');

    $totalload_kw = floatval(str_replace(',', '', trim($_POST['totalload'] ?? '1000')));
    $monthly_consumption = floatval(str_replace(',', '', trim($_POST['monthly_consumption'] ?? '0')));

    // Automatically calculate annual consumption from the monthly input
    $annual_consumption = $monthly_consumption * 12;

    $base_unit_cost = floatval(str_replace(',', '', trim($_POST['unitcost'] ?? '6.96')));
    $i_type = $_POST['i_type'] ?? 'Other';

    // --- 2. CALCULATED VALUES ---
    $today_date = date("d F Y");

    $gridRate = $base_unit_cost + round(($base_unit_cost * 22 / 100), 2);

    $solarCapacity1 = ($totalload_kw * 1.4) / 1000;

    $solarCapacity2 = 0;
    if ($monthly_consumption > 0) {
        $solarCapacity2 = $monthly_consumption / 120000;
    }

    if ($solarCapacity1 > 0 && $solarCapacity2 > 0) {
        $solarCapacityMw = min($solarCapacity1, $solarCapacity2);
    } else {
        $solarCapacityMw = max($solarCapacity1, $solarCapacity2);
    }
    if ($solarCapacityMw <= 0) {
        $solarCapacityMw = 1.0;
    }

    $first_year_generation = 1440000 * $solarCapacityMw;
    $monthly_solar_generation = $first_year_generation / 12;

    $sparkGridFixed = ($i_type === 'Manufacturing') ? 4.75 : 5.75;
    $omChargeInitial = 0.30;
    $sparkGridSolarCost = $sparkGridFixed + $omChargeInitial;

    $immediate_savings = $gridRate - $sparkGridSolarCost;

    $total_investment_crore = 3.5 * $solarCapacityMw;
    $captive_investment_lakh = 30 * $solarCapacityMw;
    $captive_investment_crore = $captive_investment_lakh / 100;

    // --- 3. BUILD 25-YEAR SAVINGS TABLE ROWS ---
    $lossFactor = 0.08;
    $annual_degradation = 0.008;
    $discom_escalation = 0.03;
    $omIncrement = 0.05;

    $current_generation = $first_year_generation;
    $current_discom = $gridRate;
    $current_om = $omChargeInitial;
    $cumulative_savings = 0;
    $table_rows = "";

    $display_years = [1, 5, 10, 15, 20, 25];
    $row_count = 0;

    for ($year = 1; $year <= 25; $year++) {
        $net_received = $current_generation * (1 - $lossFactor);
        $discom_cost = $net_received * $current_discom;
        $spark_total_rate = $sparkGridFixed + $current_om;
        $solar_cost = $current_generation * $spark_total_rate;

        $net_savings = $discom_cost - $solar_cost;
        $monthly_savings = $net_savings / 12;

        $cumulative_savings += $net_savings;

        if (in_array($year, $display_years)) {
            $bg_color = ($row_count % 2 == 0) ? '#ffffff' : '#fcfcfc';
            $table_rows .= "
            <tr style='background-color: {$bg_color};'>
                <td><strong>{$year}</strong></td>
                <td>" . formatIndianCurrency($current_generation) . "</td>
                <td>" . formatIndianCurrency($net_received) . "</td>
                <td>₹ " . formatIndianCurrency($discom_cost) . "</td>
                <td>₹ " . formatIndianCurrency($solar_cost) . "</td>
                <td class='text-green'><strong>₹ " . formatIndianCurrency($net_savings) . "</strong></td>
                <td class='text-green'><strong>₹ " . formatIndianCurrency($monthly_savings) . "</strong></td>
            </tr>";
            $row_count++;
        }

        $current_generation *= (1 - $annual_degradation);
        $current_discom *= (1 + $discom_escalation);
        $current_om *= (1 + $omIncrement);
    }

    $savings_in_crores = $cumulative_savings / 10000000;
    $formatted_savings_crores = number_format($savings_in_crores, 2);

    // --- 4. HTML TEMPLATE FOR PDF ---
    $logoUrl = 'https://sparkgrid.co.in/assets/images/logo3d2.png';
    $coverImageUrl = 'https://sparkgrid.co.in/assets/images/Solution-1-720x480.jpg';

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            @page { margin: 80px 40px 70px 40px; }
            body { font-family: 'DejaVu Sans', sans-serif; font-size: 13px; color: #333333; line-height: 1.5; }
            
            /* Global Header and Footer */
            header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; border-bottom: 2px solid #4CAF50; text-align: right; }
            header img { height: 45px; float: left; }
            footer { position: fixed; bottom: -40px; left: 0px; right: 0px; height: 30px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; padding-top: 10px; }
            
            h1, h2, h3, h4 { color: #1a237e; margin-bottom: 8px; margin-top: 0; }
            h1 { font-size: 26px; }
            h2 { font-size: 20px; color: #4CAF50; }
            h3 { font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px;}
            
            /* --- EXACT ORDER COVER PAGE CSS --- */
            .cover-page { text-align: center; margin-top: 0px; }
            
            /* 1 & 2: Titles */
            .cover-title-area { margin-bottom: 15px; }
            .cover-title-area h1 { font-size: 34px; font-weight: bold; color: #1a237e; margin-bottom: 8px; text-transform: uppercase; }
            .cover-title-area h2 { font-size: 22px; color: #4CAF50; font-weight: bold; text-transform: uppercase; margin-top: 0; }
            
            /* 3: Hero Image (380px height as requested) */
            .cover-image { width: 100%; height: 380px; object-fit: cover; border-radius: 4px; margin-bottom: 25px; border: 1px solid #ddd; }
            
            /* 4: Client Section */
            .cover-client { margin-bottom: 20px; }
            .cover-label { font-size: 14px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
            .cover-name { font-size: 26px; color: #1a237e; font-weight: bold; margin: 0 0 6px 0; }
            .cover-address { font-size: 16px; color: #333; margin: 0; }
            
            /* 5: Table Section */
            .cover-table { width: 60%; margin: 0 auto 20px auto; border-collapse: collapse; }
            .cover-table td { padding: 12px 20px; font-size: 16px; border: 1px solid #ccc; }
            .cover-table td:first-child { text-align: left; font-weight: bold; color: #333; background-color: #f9f9f9; }
            .cover-table td:last-child { text-align: right; font-weight: bold; color: #1a237e; }
            
            /* 6: Prepared By Section */
            .cover-prepared { margin-top: 5px; }
            .cover-company { font-size: 18px; color: #1a237e; font-weight: bold; margin: 0; }
            /* --- END COVER PAGE CSS --- */

            /* --- TABLE OF CONTENTS CSS --- */
            .toc-container { width: 85%; margin: 0 auto; padding-top: 30px; }
            .toc-title { text-align: center; color: #1a237e; font-size: 28px; margin-bottom: 40px; text-transform: uppercase; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; display: inline-block; }
            .toc-item { font-size: 16px; color: #333; margin-bottom: 15px; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
            .toc-num { font-weight: bold; color: #4CAF50; display: inline-block; width: 30px; }
            /* --- END TOC CSS --- */

            .section { margin-bottom: 15px; page-break-inside: avoid; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; page-break-inside: avoid;}
            table.data-table th, table.data-table td { border: 1px solid #dee2e6; padding: 8px 4px; text-align: center; font-size: 11px; }
            table.data-table th { background-color: #343a40; color: #ffffff; font-weight: normal; font-size: 11px; vertical-align: middle; }
            .highlight-row { background-color: #e8f5e9; font-weight: bold; }
            .text-green { color: #2e7d32; }
            
            ul { padding-left: 20px; margin-top: 5px; margin-bottom: 10px; }
            li { margin-bottom: 6px; }
            .page-break { page-break-before: always; }
            
            .feature-box { background-color: #f9f9f9; padding: 12px 15px; border-left: 4px solid #4CAF50; margin-bottom: 12px; page-break-inside: avoid; }
            .feature-box h4 { margin-top: 0; margin-bottom: 4px; color: #1a237e; font-size: 14px; }
            .feature-box p { margin: 0; font-size: 12px; color: #555; }
        </style>
    </head>
    <body>
    
        <header>
            <img src='{$logoUrl}' alt='Spark Grid Logo'>
            <div style='padding-top: 15px; color: #666; font-size: 12px;'>
                Captive Solar Power Proposal | {$today_date}
            </div>
        </header>

        <footer>
            Spark Grid Private Limited | +91 78339 00007 | info@sparkgrid.co.in | www.sparkgrid.co.in
        </footer>
        <div class='cover-page'>
            
            <div class='cover-title-area'>
                <h1>Spark Grid Renewable Energy</h1>
                <h2>CAPTIVE SOLAR POWER PROPOSAL</h2>
            </div>
            
            <img src='{$coverImageUrl}' class='cover-image' alt='Solar Panels'>

            <div class='cover-client'>
                <div class='cover-label'>Prepared Exclusively For:  </div>
                <div class='cover-name'>M/s {$proposal_for}</div>
                <div class='cover-address'>{$address}</div>
            </div>
            
            <table class='cover-table'>
                <tr>
                    <td>Sanctioned Load</td>
                    <td>" . number_format($totalload_kw / 1000, 2) . " MW</td>
                </tr>
                <tr>
                    <td>Proposed Capacity</td>
                    <td>" . number_format($solarCapacityMw, 2) . " MW</td>
                </tr>
            </table>

            <div class='cover-prepared'>
                <div class='cover-label'>Prepared By:</div>
                <div class='cover-company'>Spark Grid Private Limited</div>
            </div>

        </div>

        <div class='page-break'></div>

        <div class='toc-container'>
            <div style='text-align: center;'>
                <h2 class='toc-title'>Table of Contents</h2>
            </div>
            
            <div class='toc-item'><span class='toc-num'>1.</span> About Spark Grid</div>
            <div class='toc-item'><span class='toc-num'>2.</span> Captive Solar Policy Framework</div>
            <div class='toc-item'><span class='toc-num'>3.</span> Project Overview & Energy Profile</div>
            <div class='toc-item'><span class='toc-num'>4.</span> Project Investment Structure</div>
            <div class='toc-item'><span class='toc-num'>5.</span> 25-Year Financial Savings Projection</div>
            <div class='toc-item'><span class='toc-num'>6.</span> Project Implementation Timeline</div>
            <div class='toc-item'><span class='toc-num'>7.</span> Why Spark Grid</div>
            <div class='toc-item'><span class='toc-num'>8.</span> Why Act Now?</div>
            <div class='toc-item'><span class='toc-num'>9.</span> Immediate Financial Impact</div>
        </div>

        <div class='page-break'></div>

        <div class='section'>
            <h3>1. About Spark Grid</h3>
            <p>Spark Grid Private Limited is a renewable energy solutions provider focused on enabling industries to transition to cost-efficient and sustainable power sources. The company specializes in designing, developing, and managing solar power projects under captive and group captive models, allowing commercial and industrial consumers to reduce their dependence on conventional grid electricity.</p>
            <p>By leveraging high-efficiency solar technology, robust project engineering, and professional operations & maintenance systems, Spark Grid ensures reliable power generation with predictable long-term costs while helping companies achieve ESG and sustainability goals.</p>
        </div>
        
        <div class='section'>
            <h3>2. Captive Solar Policy Framework</h3>
            <p>The Government of India and many state governments promote renewable energy adoption through the Captive and Group Captive Power Policy, enabling industries to generate electricity for their own consumption.</p>
            <p>Under the group captive model, participating consumers must hold at least 26% equity ownership in the generating company and consume a minimum of 51% of the electricity produced. This structure allows industrial users to benefit from reduced grid dependence and protection from rising power tariffs.</p>
        </div>

        <div class='section'>
            <h3>3. Project Overview & Energy Profile</h3>
            <table class='data-table'>
                <tr>
                    <th style='text-align: left; padding: 8px;'>Parameter</th>
                    <th style='padding: 8px;'>Details</th>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Sanctioned Load</td>
                    <td style='padding: 8px;'>" . number_format($totalload_kw / 1000, 2) . " MW</td>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Annual Consumption</td>
                    <td style='padding: 8px;'>" . formatIndianCurrency($annual_consumption) . " Units</td>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Average Monthly Consumption</td>
                    <td style='padding: 8px;'>" . formatIndianCurrency($monthly_consumption) . " Units</td>
                </tr>
                <tr class='highlight-row'>
                    <td style='text-align: left; color: #2e7d32; padding: 8px;'>Proposed Solar Capacity</td>
                    <td style='color: #2e7d32; padding: 8px;'>" . number_format($solarCapacityMw, 2) . " MW</td>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Estimated Monthly Solar Generation</td>
                    <td style='padding: 8px;'>" . formatIndianCurrency($monthly_solar_generation) . " Units</td>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Current DISCOM Cost</td>
                    <td style='padding: 8px;'>₹ " . number_format($gridRate, 2) . " / unit</td>
                </tr>
                <tr>
                    <td style='text-align: left; padding: 8px;'>Spark Grid Solar Cost</td>
                    <td style='padding: 8px;'>₹ " . number_format($sparkGridSolarCost, 2) . " / unit</td>
                </tr>
                <tr class='highlight-row'>
                    <td style='text-align: left; color: #2e7d32; padding: 8px;'>Immediate Savings</td>
                    <td style='color: #2e7d32; padding: 8px;'>₹ " . number_format($immediate_savings, 2) . " / unit</td>
                </tr>
            </table>
        </div>

        <div class='page-break'>
            <h3>4. Project Investment Structure</h3>
            <ul style='background-color: #f9f9f9; padding: 15px 15px 15px 35px; border-left: 4px solid #4CAF50;'>
                <li>Estimated project development cost for solar installation = <strong>₹ 3.5 crore per MW</strong>.</li>
                <li>Proposed Solar Capacity = <strong>" . number_format($solarCapacityMw, 2) . " MW</strong> plant.</li>
                <li>Total project investment = 3.5 * " . number_format($solarCapacityMw, 2) . " = <strong>₹ " . number_format($total_investment_crore, 2) . " crore</strong>.</li>
                <li>Captive User Investment = <strong>₹ 30 lakh per MW</strong> as equity participation.</li>
                <li>For Proposed Capacity of " . number_format($solarCapacityMw, 2) . " MW, {$proposal_for}, total Investment = <strong>₹ " . number_format($captive_investment_crore, 2) . " crore</strong>.</li>
            </ul>
            <p style='font-size: 12px;'><em>*Dividend: After debt clearance, the captive user investment carries dividend, approximately ₹ 8-10 lakh per MW annually.</em></p>
        </div>

        <div class='section'>
            <h3>5. 25-Year Financial Savings Projection</h3>
            <p style='margin-bottom: 5px; font-size: 12px;'><strong>Assumptions:</strong> 
            Solar Basic Cost: ₹ {$sparkGridFixed}/unit | Wheeling & Losses: 8% | Initial O&M: ₹ {$omChargeInitial}/unit | O&M Esc: 5% | DISCOM Esc: 3%</p>
            
            <table class='data-table'>
                <tr>
                    <th>COD<br>Year</th>
                    <th>Energy Gen.<br><small>(Units)</small></th>
                    <th>Net Received<br><small>(Units)</small></th>
                    <th>Discom<br>Cost <small>(₹)</small></th>
                    <th>Spark Grid<br>Cost <small>(₹)</small></th>
                    <th>Annual<br>Savings <small>(₹)</small></th>
                    <th>Monthly<br>Savings <small>(₹)</small></th>
                </tr>
                {$table_rows}
                <tr>
                    <td colspan='5' style='text-align: right; font-weight: bold; font-size: 12px; padding: 10px;'>Cumulative Savings</td>
                    <td colspan='2' class='highlight-row' style='font-size: 13px; color: #2e7d32; text-align: center; padding: 10px;'>₹ " . formatIndianCurrency($cumulative_savings) . "</td>
                </tr>
            </table>
            <p style='font-size: 11px; color: #555; line-height: 1.3;'><em>*Note: The projected savings & dividend presented above are illustrative estimates based on current electricity tariffs, regulatory framework, and operational assumptions. Actual savings may vary depending on changes in government policies, regulatory provisions, tariff revisions, applicable charges, and force majeure events.</em></p>
        </div>

        <div class='page-break'>
            <h3>6. Project Implementation Timeline</h3>
            <ul style='line-height: 1.6;'>
                <li><strong>Feasibility Study & Energy Assessment</strong> – 2-3 weeks</li>
                <li><strong>Captive Structure Formation & Regulatory Approvals</strong> – 4-6 weeks</li>
                <li><strong>Land Identification & Grid Connectivity Approvals</strong> – 3-4 weeks</li>
                <li><strong>Engineering Design & Procurement</strong> – 4-6 weeks</li>
                <li><strong>Solar Plant Construction</strong> – 8-10 weeks</li>
                <li><strong>Testing, Commissioning & Synchronization</strong> – 2-3 weeks</li>
            </ul>
            <p style='background-color: #e8f5e9; padding: 10px; border-radius: 5px; color: #1b5e20; font-weight: bold;'>Total estimated project timeline: approximately 5-6 months.</p>
        </div>

        <div class='section'>
            <h3>7. Why Spark Grid</h3>
            <ul style='line-height: 1.6;'>
                <li>Specialized expertise in industrial solar and captive power structures</li>
                <li>Optimized tariffs delivering long-term electricity cost savings</li>
                <li>End-to-end project development including approvals and compliance</li>
                <li>High-efficiency solar modules and advanced monitoring systems</li>
                <li>Professional long-term operations and maintenance services</li>
                <li>Helps companies achieve sustainability and ESG targets</li>
            </ul>
        </div>
        
        <div class='section'>
            <h3>8. Why Act Now?</h3>
            <p style='margin-bottom: 10px;'>The economics of solar power are highly attractive today, but several regulatory and market factors make early adoption particularly advantageous.</p>
            
            <div class='feature-box'>
                <h4>1. Rising Grid Electricity Tariffs</h4>
                <p>Industrial electricity tariffs have historically increased by 3-5% annually. Locking in solar power today allows industries to protect themselves from long-term tariff escalation.</p>
            </div>
            <div class='feature-box'>
                <h4>2. Increasing Open Access Charges</h4>
                <p>Regulators periodically revise charges such as wheeling and cross-subsidy surcharges. Projects implemented earlier often benefit from more stable and predictable charges.</p>
            </div>
            <div class='feature-box'>
                <h4>3. Limited Renewable Capacity Availability</h4>
                <p>As more industries move toward renewable power, grid connectivity slots become limited. Early adopters secure better project locations and power availability.</p>
            </div>
            <div class='feature-box'>
                <h4>4. ESG and Sustainability Commitments</h4>
                <p>Many companies are required by investors and regulators to reduce carbon emissions. Solar adoption helps meet these goals while lowering operational costs.</p>
            </div>
        </div>

        <div class='page-break'>
            <h3>9. Immediate Financial Impact</h3>
            <p>Every year of delay results in significant avoidable electricity expenses that could otherwise be saved through solar power.</p>
            
            <h3 style='color: #2e7d32; border: none; margin-top: 15px;'>Start Saving on Electricity Today</h3>
            <p>With Spark Grid's solar power solution, industries can immediately begin benefiting from:</p>
            <ul style='line-height: 1.6; list-style-type: square; color: #4CAF50;'>
                <li><span style='color: #333;'>Lower power costs</span></li>
                <li><span style='color: #333;'>Long-term tariff protection with Zero Escalation</span></li>
                <li><span style='color: #333;'>Upfront investment equal to aprox 3 months electricity bill, can be recovered over a period of 12-15 months only.</span></li>
                <li><span style='color: #333;'>Clean and sustainable energy</span></li>
                <li><span style='color: #333;'>No Operational headache for Captive user</span></li>
                <li><span style='color: #333;'>No Leverage of loan for Captive User</span></li>
            </ul>
            
            <div style='background-color: #e8f5e9; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;'>
                <h4 style='color: #1b5e20; margin: 0;'>Estimated potential savings over 25 years: <br><span style='font-size: 22px;'>~ ₹ {$formatted_savings_crores} crore</span> based on current assumptions.</h4>
            </div>
            
            <p style='text-align: center; font-size: 14px;'>Let us help you convert your electricity expense into a long-term financial advantage. <br><strong>Schedule a one to one discussion for next round of discussion and signing of LOI.</strong></p>
            
            <div style='margin-top: 40px; border-top: 1px solid #ccc; width: 300px; padding-top: 15px;'>
                <strong>Amandeep Singla - COO</strong><br>
                Spark Grid Private Limited<br>
                +91 78339 00007<br>
                info@sparkgrid.co.in<br>
                www.sparkgrid.co.in
            </div>
        </div>

    </body>
    </html>
    ";

    // --- 5. INITIALIZE DOMPDF AND OUTPUT ---
    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $pdfOutput = $dompdf->output();
    $filename = "Spark_Grid_Proposal_" . preg_replace('/[^A-Za-z0-9_\-]/', '_', $proposal_for) . ".pdf";

    // --- 6. EMAIL INTEGRATION WITH PHPMAILER ---
    $client_email = $_POST['client_email'] ?? '';

    if (!empty($client_email) && filter_var($client_email, FILTER_VALIDATE_EMAIL)) {
        require_once 'PHPMailer/Exception.php';
        require_once 'PHPMailer/PHPMailer.php';
        require_once 'PHPMailer/SMTP.php';

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        try {
            $mail->SMTPDebug = 0;
            $mail->isSMTP();
            $mail->Host = SMTP_HOST;
            $mail->SMTPAuth = false;
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
            $mail->SMTPSecure = false;       // \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = SMTP_PORT;

            $mail->setFrom('info@sparkgrid.co.in', 'Spark Grid Proposals');
            $mail->addAddress($client_email, $proposal_for);
            $mail->addBCC('info@sparkgrid.co.in');

            $mail->addStringAttachment($pdfOutput, $filename, 'base64', 'application/pdf');

            $mail->isHTML(true);
            $mail->Subject = 'Your Captive Solar Power Proposal - Spark Grid';

            $mail->Body = "
                <h3>Dear M/s {$proposal_for},</h3>
                <p>Thank you for considering Spark Grid for your renewable energy requirements.</p>
				<p>Please find attached your customized 25-year captive solar power projection. Based on your current energy consumption and tariff structure, the analysis indicates potential savings of up to <strong>₹ {$formatted_savings_crores} crore</strong> over the project lifecycle, based on an estimated solar plant capacity of <strong>{$solarCapacityMw} MW</strong>.</p>
                <p>This proposal highlights not only the substantial financial savings but also the long-term benefits of energy cost stability, sustainability, and reduced dependence on conventional power sources.</p>
                <p>Our team will connect with you shortly to schedule a discussion, walk you through the projections in detail, address any queries, and align on the next steps.</p>
                <br>
                <p>Best regards,<br>
                <strong>Amandeep Singla - COO</strong><br>
                Spark Grid Private Limited<br>
                +91 78339 00007<br>
                <a href='https://sparkgrid.co.in'>www.sparkgrid.co.in</a></p>
            ";

            $mail->AltBody = "Hello {$proposal_for},\n\nPlease find attached your custom Captive Solar Power Proposal. Let us know when you are available to discuss the next steps.\n\nBest regards,\nAmandeep Singla\nSpark Grid Private Limited";

            $mail->send();
        } catch (Exception $e) {
            error_log("Proposal Email could not be sent. Mailer Error: {$mail->ErrorInfo}");
        }
    }

    // --- 7. FORCE DOWNLOAD IN BROWSER ---
    $dompdf->stream($filename, ["Attachment" => true]);
    exit();
} else {
    header("Location: proposal_form.php");
    exit();
}
?>