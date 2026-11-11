import { useState, useEffect } from 'react'
import api from '../api/axios'
import { formatCurrency, apiError } from '../utils/format'
import Modal from './Modal'
import Button from './Button'
import Select from './Select'
import Spinner from './Spinner'
import { Search, Plus, Minus, Trash2, ShoppingBag, Coffee, Printer, Package, CheckCircle2 } from 'lucide-react'

export default function CounterSaleModal({ isOpen, onClose, onSuccess, toast }) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [cart, setCart] = useState([]) // [{ service_id, name, price, quantity, stock_qty }]
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (isOpen) {
      loadData()
      setCart([])
      setDiscount(0)
      setPaymentMode('cash')
      setSelectedCustomerId('')
      setSearch('')
      setCategoryFilter('all')
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [srvRes, custRes] = await Promise.all([
        api.get('/services'),
        api.get('/customers?limit=200'),
      ])
      setServices(srvRes.data.data.filter((s) => s.is_active))
      setCustomers(custRes.data.data.items || [])
    } catch {
      toast?.error('Failed to load services and customers')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (service) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.service_id === service.id)
      if (exists) {
        if (service.stock_qty !== null && exists.quantity >= service.stock_qty) {
          toast?.error(`Maximum stock available for ${service.name} is ${service.stock_qty}`)
          return prev
        }
        return prev.map((item) =>
          item.service_id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...prev,
        {
          service_id: service.id,
          name: service.name,
          price: parseFloat(service.price),
          quantity: 1,
          stock_qty: service.stock_qty,
        },
      ]
    })
  }

  const updateQuantity = (serviceId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.service_id === serviceId) {
            const nextQty = item.quantity + delta
            if (item.stock_qty !== null && nextQty > item.stock_qty) {
              toast?.error(`Maximum available stock is ${item.stock_qty}`)
              return item
            }
            return { ...item, quantity: nextQty }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (serviceId) => {
    setCart((prev) => prev.filter((item) => item.service_id !== serviceId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const discountVal = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0))
  const total = Math.max(0, subtotal - discountVal)

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast?.error('Please add at least one item to cart')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
        items: cart.map((c) => ({ service_id: c.service_id, quantity: c.quantity })),
        discount: discountVal,
        payment_mode: paymentMode,
      }

      const res = await api.post('/bills/counter', payload)
      toast?.success('Counter bill created successfully!')
      onClose()
      if (onSuccess) onSuccess(res.data.data)
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (categoryFilter === 'all') return true
    if (categoryFilter === 'print') return /print|xerox|scan|copy/i.test(s.name)
    if (categoryFilter === 'beverage') return /tea|coffee|water|juice|drink|cold/i.test(s.name)
    if (categoryFilter === 'snack') return /snack|biscuit|chips|maggi|noodle|cookie/i.test(s.name)
    return true
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Counter Sale (Walk-in / Takeout)" size="lg">
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Bar: Customer Selector */}
          <div className="bg-[#ECE4A9] border-2 border-[#2A2407] rounded-xl p-3.5 shadow-[2px_2px_0px_#2A2407]">
            <Select
              id="counter-customer-select"
              label="Customer (Optional — defaults to Walk-in Guest)"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              options={[
                { value: '', label: 'Walk-in Guest (Counter Sale)' },
                ...customers.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.phone || 'No phone'})`,
                })),
              ]}
            />
          </div>

          {/* Main Grid: Catalog Left, Cart Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Catalog (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              {/* Category Filters & Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none stroke-[2.2]" />
                  <input
                    type="text"
                    placeholder="Search tea, print, snacks..."
                    className="input pl-9 text-xs font-medium w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: 'All Items' },
                  { key: 'print', label: 'Prints & Xerox' },
                  { key: 'beverage', label: 'Drinks & Tea' },
                  { key: 'snack', label: 'Snacks' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold border border-[#2A2407] transition-all ${
                      categoryFilter === cat.key
                        ? 'bg-[#2A2407] text-[#F5F0D0]'
                        : 'bg-white text-ink hover:bg-[#ECE4A9]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredServices.length === 0 ? (
                  <p className="text-center text-xs text-ink-muted py-8 font-medium">No services match your search.</p>
                ) : (
                  filteredServices.map((service) => {
                    const isOutOfStock = service.stock_qty !== null && service.stock_qty <= 0
                    return (
                      <div
                        key={service.id}
                        className="bg-white border-2 border-[#2A2407] rounded-xl p-2.5 flex items-center justify-between shadow-[2px_2px_0px_#2A2407] hover:bg-[#FAF7EB] transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-ink">{service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-extrabold text-[#EC7E00] font-mono">
                              {formatCurrency(service.price)}
                            </span>
                            {service.stock_qty !== null && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : 'bg-green-100 text-green-800 border-green-300'
                                }`}
                              >
                                {isOutOfStock ? 'Out of stock' : `${service.stock_qty} in stock`}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(service)}
                          disabled={isOutOfStock}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-[#2A2407] bg-[#EC7E00] text-white hover:bg-[#d67200] disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_#2A2407] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                        >
                          + Add
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Cart & Billing (5 cols) */}
            <div className="md:col-span-5 bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-3.5 flex flex-col justify-between shadow-[3px_3px_0px_#2A2407]">
              <div>
                <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-[#2A2407]/40 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-[#EC7E00]" /> Order items ({cart.reduce((a, b) => a + b.quantity, 0)})
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Cart Items */}
                <div className="max-h-44 overflow-y-auto space-y-2 pr-1 mb-3">
                  {cart.length === 0 ? (
                    <p className="text-center text-xs text-ink-muted py-6">Cart is empty. Click + Add on items.</p>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.service_id}
                        className="bg-white border border-[#2A2407] rounded-lg p-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-ink truncate">{item.name}</p>
                          <p className="text-[11px] font-mono text-ink-muted">
                            {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.service_id, -1)}
                            className="p-1 rounded bg-[#ECE4A9] border border-[#2A2407] hover:bg-[#ddd595]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-bold font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.service_id, 1)}
                            className="p-1 rounded bg-[#ECE4A9] border border-[#2A2407] hover:bg-[#ddd595]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.service_id)}
                            className="p-1 text-red-600 hover:text-red-800 ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Checkout Calculation */}
              <div className="pt-2 border-t-2 border-dashed border-[#2A2407]/40 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-ink-muted">Subtotal:</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-muted">Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="input w-20 py-0.5 px-2 text-right text-xs font-mono font-bold"
                  />
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#2A2407] pt-1 border-t border-[#2A2407]/20">
                  <span>Total Due:</span>
                  <span className="text-base font-mono text-[#EC7E00]">{formatCurrency(total)}</span>
                </div>

                {/* Payment Mode */}
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-ink uppercase tracking-wider block mb-1">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['cash', 'upi', 'card'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-1 text-xs font-extrabold uppercase rounded-lg border-2 border-[#2A2407] transition-all ${
                          paymentMode === mode
                            ? 'bg-[#EC7E00] text-white shadow-[1px_1px_0px_#2A2407]'
                            : 'bg-white text-ink hover:bg-[#ECE4A9]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    id="submit-counter-bill-btn"
                    className="w-full"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={cart.length === 0}
                  >
                    Confirm & Bill ({formatCurrency(total)})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

