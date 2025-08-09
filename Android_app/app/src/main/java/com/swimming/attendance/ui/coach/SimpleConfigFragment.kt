package com.swimming.attendance.ui.coach

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

/**
 * 簡單的配置Fragment
 */
class SimpleConfigFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        val titleText = TextView(requireContext()).apply {
            text = "系統配置"
            textSize = 20f
            setPadding(0, 0, 0, 16)
        }
        layout.addView(titleText)

        val infoText = TextView(requireContext()).apply {
            text = "配置功能開發中..."
            textSize = 16f
        }
        layout.addView(infoText)

        return layout
    }
}
