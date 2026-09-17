import urllib.parse
import streamlit as st
import requests

st.set_page_config(
    page_title="Gadget Intelligence Agent - India Edition",
    page_icon="🇮🇳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS styling for premium feel
st.markdown("""
<style>
    .metric-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .vfm-box {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-left: 5px solid #22c55e;
        border-radius: 8px;
        padding: 14px 18px;
        margin: 15px 0;
        color: #14532d;
    }
    .store-btn {
        display: inline-block;
        padding: 8px 16px;
        margin: 4px 6px 4px 0;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
    }
    .variant-badge {
        display: inline-block;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 12px;
        margin: 4px;
        font-size: 13px;
        font-weight: 500;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar with market context and tips
with st.sidebar:
    st.title("🇮🇳 Gadget Agent")
    st.markdown("**India Market Edition**")
    st.write("Searches Indian retail prices, variants, availability, and hardware specs in real-time.")
    
    st.markdown("---")
    st.markdown("### 🔍 Quick Search Examples")
    example_prompts = [
        "OnePlus 12R",
        "iPhone 15",
        "Sony WH-1000XM5",
        "MacBook Air M2",
        "Samsung Galaxy S24 Ultra",
        "iQOO Neo 9 Pro"
    ]
    for eg in example_prompts:
        if st.button(eg, use_container_width=True):
            st.session_state["search_query"] = eg

    st.markdown("---")
    st.caption("Backed by real-time DuckDuckGo search and Gemini 3.6 Flash.")

# Header
st.title("⚡ Gadget Intelligence Agent")
st.caption("Real-time gadget research, hardware specs, and Indian market pricing (INR ₹).")

if "search_query" not in st.session_state:
    st.session_state["search_query"] = ""

query = st.text_input(
    "Enter gadget name or model number:",
    value=st.session_state["search_query"],
    placeholder="e.g., OnePlus 12R, Sony WH-1000XM5, or Apple Watch Series 9"
)

if st.button("🔍 Research Gadget & Indian Pricing", type="primary", use_container_width=True):
    if not query.strip():
        st.warning("Please enter a gadget name or model to search.")
    else:
        with st.spinner(f"Agent researching specs & Indian market pricing for '{query}'..."):
            try:
                response = requests.post(
                    "http://127.0.0.1:8000/api/gadget/research",
                    json={"query": query},
                    timeout=90
                )
                if response.status_code == 200:
                    data = response.json()
                    
                    st.success("✅ Research Completed!")
                    
                    # Top Metrics Row
                    m_col1, m_col2, m_col3, m_col4 = st.columns(4)
                    
                    price_inr = data.get("price_inr_range") or data.get("estimated_price_range") or "N/A"
                    brand_model = f"{data.get('brand', '')} {data.get('exact_model', '')}".strip()
                    
                    with m_col1:
                        st.metric("💰 Price in India (INR)", price_inr)
                    with m_col2:
                        st.metric("📱 Device", brand_model if brand_model else "N/A")
                    with m_col3:
                        st.metric("📅 Release Year", data.get("release_year") or "N/A")
                    with m_col4:
                        st.metric("🌐 Global / US MSRP", data.get("price_usd_range") or "N/A")

                    # Availability Banner
                    avail = data.get("india_availability", "Available")
                    st.info(f"**📦 India Availability & Channels:** {avail}")

                    # Indian Store Search Quick Links
                    encoded_query = urllib.parse.quote_plus(f"{data.get('brand', '')} {data.get('exact_model', '')}".strip() or query)
                    amazon_url = f"https://www.amazon.in/s?k={encoded_query}"
                    flipkart_url = f"https://www.flipkart.com/search?q={encoded_query}"
                    croma_url = f"https://www.croma.com/searchB?q={encoded_query}"
                    
                    st.markdown(
                        f"""
                        **🛒 Live Store Quick Search:**
                        [🛍️ Check on Amazon.in]({amazon_url}) &nbsp;|&nbsp;
                        [📦 Check on Flipkart]({flipkart_url}) &nbsp;|&nbsp;
                        [🏬 Check on Croma]({croma_url})
                        """,
                        unsafe_allow_html=True
                    )

                    # Value for Money Verdict
                    vfm = data.get("india_vfm_verdict")
                    if vfm:
                        st.markdown(
                            f"""
                            <div class="vfm-box">
                                <strong>💡 Indian Market VFM Verdict:</strong><br>{vfm}
                            </div>
                            """,
                            unsafe_allow_html=True
                        )

                    st.markdown("---")

                    # Variant Pricing Section
                    variants = data.get("variants_pricing", [])
                    if variants:
                        st.subheader("📊 Variant & Storage Pricing in India")
                        v_cols = st.columns(min(len(variants), 4))
                        for idx, var_info in enumerate(variants):
                            col_target = v_cols[idx % len(v_cols)]
                            col_target.markdown(f"🏷️ **{var_info}**")
                        st.markdown("---")

                    # Key Specifications
                    st.subheader("🛠️ Technical Specifications")
                    specs = data.get("key_specs", [])
                    if specs:
                        spec_cols = st.columns(2)
                        for i, spec in enumerate(specs):
                            target_col = spec_cols[i % 2]
                            target_col.markdown(f"- {spec}")

                    st.markdown("---")

                    # Pros & Cons Columns
                    col_pro, col_con = st.columns(2)
                    with col_pro:
                        st.subheader("✅ Pros & Highlights")
                        for pro in data.get("key_pros", []):
                            st.markdown(f"- {pro}")

                    with col_con:
                        st.subheader("⚠️ Cons & Trade-offs")
                        for con in data.get("key_cons", []):
                            st.markdown(f"- {con}")

                    # Official Support URL
                    support_url = data.get("official_support_url")
                    if support_url:
                        st.markdown("---")
                        st.markdown(f"📖 **Official Documentation & Support:** [{support_url}]({support_url})")

                else:
                    st.error(f"Error {response.status_code}: {response.text}")
            except requests.exceptions.ConnectionError:
                st.error("Could not connect to FastAPI server. Ensure FastAPI is running on `http://127.0.0.1:8000`.")
            except Exception as e:
                st.error(f"Unexpected error: {str(e)}")