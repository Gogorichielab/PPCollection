function sanitizeFirearmInput(body) {
  return {
    make: (body.make || '').trim(),
    model: (body.model || '').trim(),
    serial: (body.serial || '').trim(),
    caliber: (body.caliber || '').trim(),
    purchase_date: (body.purchase_date || '').trim(),
    purchase_price: body.purchase_price ? Number(body.purchase_price) : null,
    condition: (body.condition || '').trim(),
    location: (body.location || '').trim(),
    status: (body.status || '').trim(),
    notes: (body.notes || '').trim(),
    gun_warranty: body.gun_warranty ? 1 : 0,
    firearm_type: (body.firearm_type || '').trim()
  };
}

module.exports = { sanitizeFirearmInput };
