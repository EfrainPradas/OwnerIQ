const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

(async () => {
  try {
    // Usar el property_id que ya conocemos
    const propertyId = '360f6cc7-775d-4264-8c1f-1a91590312f6';

    const { data, error } = await supabase
      .from('property')
      .select('property_id, address, closing_date, loan_amount, loan_rate, loan_term')
      .eq('property_id', propertyId)
      .single();

    if (error) {
      console.error('❌ Error fetching property:', error);
      return;
    }

    const property = data;
    console.log('📊 Property found:', {
      property_id: property.property_id,
      address: property.address,
      closing_date: property.closing_date,
      loan_amount: property.loan_amount,
      loan_rate: property.loan_rate,
      loan_term: property.loan_term
    });

    // Si no hay closing_date, usar diciembre 18, 2020 (fecha típica de cierre)
    const closingDate = property.closing_date ? new Date(property.closing_date) : new Date('2020-12-18');
    console.log('📅 Closing date:', closingDate.toISOString().split('T')[0]);

    // Primer pago es 1 mes después del cierre
    const firstPaymentDate = new Date(closingDate);
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1);

    const firstPaymentStr = firstPaymentDate.toISOString().split('T')[0];
    console.log('💰 Calculated first_payment_date:', firstPaymentStr);

    // Actualizar la propiedad
    const { error: updateError } = await supabase
      .from('property')
      .update({ first_payment_date: firstPaymentStr })
      .eq('property_id', property.property_id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log('✅ Successfully updated property with first_payment_date:', firstPaymentStr);
      console.log('\n🔄 Now refresh the browser and click "Mortgage" on 25 Hemlock property');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
})();
