const saveRental = async (startTime: string, endTime: string, jetSkiId: string | null, status = 'active') => {
    const ht = Math.round(formData.finalTTC / 1.2)

    const buildPayload = (contractNumber: string) => ({
      client_name: formData.clientName.toUpperCase(),
      client_firstname: formData.clientFirstname,
      client_phone: formData.clientPhone,
      client_id_number: formData.clientIdNumber.toUpperCase(),
      activity_name: cartSummary || formData.cart[0]?.activity.name,
      activity_id: formData.cart[0]?.activity.id ?? null,
      cart_items: formData.cart,
      duration: mainActivity?.duration ?? '',
      duration_minutes: mainActivity?.durationMinutes ?? 0,
      price: formData.finalTTC,
      discount: formData.discount,
      price_ht: ht,
      jet_ski_id: jetSkiId,
      payment_method: formData.paymentMethod,
      signature: formData.signature,
      contract_number: contractNumber,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      status,
    })

    let { error } = await supabase.from('rentals').insert(buildPayload(formData.contractNumber))

    // Si numéro de contrat déjà utilisé → regénérer automatiquement
    if (error?.code === '23505') {
      const newContractNum = generateContractNumber()
      const retry = await supabase.from('rentals').insert(buildPayload(newContractNum))
      error = retry.error
    }

    if (error) throw error

    if (draftId) {
      await supabase.from('draft_rentals').delete().eq('id', draftId)
    }
  }
